// Restores a schema-only production snapshot into a disposable LOCAL database.
// Usage: node scripts/test-production-migration.cjs <snapshot.sql> <migration.sql>
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const container = 'supabase_db_web-recargas-juegos';
const database = `recargas_security_test_${Date.now()}`;
const [snapshot, migration] = process.argv.slice(2);
if (!snapshot || !migration) throw new Error('Snapshot and migration paths required');
function sql(db, input) {
  const r = spawnSync('docker', ['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1'],
    { input, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message || r.stdout);
  return r.stdout;
}
try {
  sql('postgres', `CREATE DATABASE ${database};`);
  sql(database, `
    DROP SCHEMA public;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  `);
  // Supabase owns this separate role locally; its future-object defaults are
  // unrelated to the postgres-owned objects and migration under test.
  const schema = fs.readFileSync(snapshot, 'utf8').replace(/^ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin .*\r?\n/gm, '');
  sql(database, schema);
  sql(database, fs.readFileSync(migration, 'utf8'));
  console.log(sql(database, fs.readFileSync('supabase/tests/production_access.sql', 'utf8')));
  // Reapplying must be safe as well.
  sql(database, fs.readFileSync(migration, 'utf8'));
  console.log('PASS: schema restore, permissions, RLS, deposits, RPCs, Realtime and migration reapply');
} finally {
  sql('postgres', `DROP DATABASE IF EXISTS ${database} WITH (FORCE);`);
}
