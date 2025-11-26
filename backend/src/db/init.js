const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'db', 'schema.sql'),
    'utf8',
  );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('Running database migrations...');
    await pool.query(sql);
    console.log('Migrations complete.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
