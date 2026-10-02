const { Client } = require('pg');
const fs = require('fs');

async function autoConnect() {
  const password = 'rXq24h3JFsyF!jm';
  const encodedPassword = encodeURIComponent(password);

  const configs = [
    {
      name: 'Pooler 5432 (Sesión - Objeto)',
      opts: {
        host: 'aws-0-us-east-1.pooler.supabase.com',
        port: 5432,
        user: 'postgres.pemkocaufntsbicnzziz',
        password: password,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000
      },
      uri: `postgresql://postgres.pemkocaufntsbicnzziz:${encodedPassword}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
    },
    {
      name: 'Pooler 6543 (Transaccional - Objeto)',
      opts: {
        host: 'aws-0-us-east-1.pooler.supabase.com',
        port: 6543,
        user: 'postgres.pemkocaufntsbicnzziz',
        password: password,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000
      },
      uri: `postgresql://postgres.pemkocaufntsbicnzziz:${encodedPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
    },
    {
      name: 'Directo 5432 (db.pemkocaufntsbicnzziz.supabase.co)',
      opts: {
        host: 'db.pemkocaufntsbicnzziz.supabase.co',
        port: 5432,
        user: 'postgres',
        password: password,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000
      },
      uri: `postgresql://postgres:${encodedPassword}@db.pemkocaufntsbicnzziz.supabase.co:5432/postgres`
    }
  ];

  let successConfig = null;
  let log = '';

  for (const cfg of configs) {
    log += `Probando conexión con: ${cfg.name}...\n`;
    const client = new Client(cfg.opts);

    try {
      await client.connect();
      log += `\n=========================================\n`;
      log += `¡CONEXIÓN EXITOSA CON ${cfg.name}!\n`;
      log += `=========================================\n\n`;

      // 1. Listar todas las tablas
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      log += `### Tablas en Schema public (${tablesRes.rows.length}):\n`;
      tablesRes.rows.forEach(r => log += `- ${r.table_name}\n`);

      // 2. Estructura de orders
      const ordersCols = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        ORDER BY ordinal_position;
      `);
      log += `\n### Columnas de 'orders':\n`;
      ordersCols.rows.forEach(c => log += `  ${c.column_name} (${c.data_type}) [nullable: ${c.is_nullable}]\n`);

      // 3. Revisar las 5 órdenes en la base de datos
      const ordersRes = await client.query(`
        SELECT id, user_id, status, finalized_at, updated_at
        FROM public.orders
        WHERE 
            id::text LIKE '38f26c8b%' OR
            id::text LIKE '633d366f%' OR
            id::text LIKE 'f3f2a317%' OR
            id::text LIKE '19127fc0%' OR
            id::text LIKE '298a556a%';
      `);
      log += `\n### Verificación de las 5 órdenes en Supabase:\n`;
      log += JSON.stringify(ordersRes.rows, null, 2) + '\n';

      // 4. Tablas de balances / billeteras / transacciones
      const balanceTables = tablesRes.rows
        .map(r => r.table_name)
        .filter(t => t.includes('wallet') || t.includes('balance') || t.includes('profile') || t.includes('transaction') || t.includes('user'));
      
      log += `\n### Tablas de Usuarios y Saldos:\n`;
      for (const bTable of balanceTables) {
        const bCols = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position;
        `, [bTable]);
        log += `- Tabla '${bTable}': ` + bCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', ') + `\n`;
      }

      await client.end();
      successConfig = cfg;
      break;
    } catch (e) {
      log += `Error: ${e.message}\n\n`;
      await client.end().catch(() => {});
    }
  }

  fs.writeFileSync('DATABASE_STATUS.md', '# Diagnóstico de Conexión Supabase\n\n```\n' + log + '```\n', 'utf8');

  if (successConfig) {
    // Actualizar .env con la URL exitosa
    let env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
    const line = `DATABASE_URL="${successConfig.uri}"`;
    if (env.includes('DATABASE_URL=')) {
      env = env.replace(/DATABASE_URL=.*/g, line);
    } else {
      env += `\n${line}\n`;
    }
    fs.writeFileSync('.env', env, 'utf8');

    // Actualizar scripts/supabase_db.cjs
    let dbScript = fs.readFileSync('scripts/supabase_db.cjs', 'utf8');
    dbScript = dbScript.replace(/const connectionString = .*/g, `const connectionString = process.env.DATABASE_URL || '${successConfig.uri}';`);
    fs.writeFileSync('scripts/supabase_db.cjs', dbScript, 'utf8');
    
    fs.writeFileSync('connection_flag.txt', 'SUCCESS: ' + successConfig.name, 'utf8');
  } else {
    fs.writeFileSync('connection_flag.txt', 'FAILED', 'utf8');
  }
}

autoConnect();

