const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'ec_students';");
    console.log('Table locations:', res.rows.map(r => `${r.table_schema}.${r.table_name}`).join(', '));
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

check();
