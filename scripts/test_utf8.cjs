const { Client } = require('pg');
const fs = require('fs');

async function testSupabase() {
  const password = 'rXq24h3JFsyF!jm';
  
  const attempts = [
    {
      name: 'Pooler Sesión (aws-0-us-east-1.pooler.supabase.com:5432)',
      client: new Client({
        host: 'aws-0-us-east-1.pooler.supabase.com',
        port: 5432,
        user: 'postgres.pemkocaufntsbicnzziz',
        password: password,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
      })
    },
    {
      name: 'Pooler Transaccional (aws-0-us-east-1.pooler.supabase.com:6543)',
      client: new Client({
        host: 'aws-0-us-east-1.pooler.supabase.com',
        port: 6543,
        user: 'postgres.pemkocaufntsbicnzziz',
        password: password,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
      })
    },
    {
      name: 'Directo (db.pemkocaufntsbicnzziz.supabase.co:5432)',
      client: new Client({
        host: 'db.pemkocaufntsbicnzziz.supabase.co',
        port: 5432,
        user: 'postgres',
        password: password,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
      })
    }
  ];

  let output = '# Informe de Conexión a Base de Datos Supabase\n\n';
  output += `Fecha de prueba: ${new Date().toLocaleString()}\n\n`;

  let connected = false;

  for (const att of attempts) {
    output += `### Probando: ${att.name}\n`;
    try {
      await att.client.connect();
      output += `> **ESTADO: CONECTADO EXITOSAMENTE**\n\n`;
      connected = true;

      // Consultar versión y base de datos
      const info = await att.client.query('SELECT current_database(), current_user;');
      output += `- **Base de datos:** \`${info.rows[0].current_database}\`\n`;
      output += `- **Usuario:** \`${info.rows[0].current_user}\`\n\n`;

      // Listar tablas en public
      const tables = await att.client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      output += `#### Tablas encontradas en schema 'public' (${tables.rows.length}):\n`;
      tables.rows.forEach(t => {
        output += `- \`${t.table_name}\`\n`;
      });

      // Consultar resumen de orders
      const ordersCount = await att.client.query('SELECT count(*) as total FROM public.orders;');
      output += `\n- **Total de registros en tabla 'orders':** ${ordersCount.rows[0].total}\n`;

      await att.client.end();
      break;
    } catch (err) {
      output += `> **Error:** ${err.message}\n\n`;
      await att.client.end().catch(() => {});
    }
  }

  if (!connected) {
    output += `\n---\n**Resumen:** No se pudo conectar a través de ningún puerto con la contraseña proporcionada. Revisa si hay un error de contraseña o bloqueo de red en Supabase.`;
  }

  // Guardar en formato UTF-8 limpio sin BOM ni caracteres nulos
  fs.writeFileSync('DATABASE_STATUS.md', output, 'utf8');
}

testSupabase();
