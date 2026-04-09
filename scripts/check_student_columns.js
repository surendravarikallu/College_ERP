const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'ec_students';");
    console.log('Columns in ec_students:', res.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

check();
