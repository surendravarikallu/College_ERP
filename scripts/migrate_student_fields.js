const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Applying manual migrations to ec_students table...');
    await client.query('ALTER TABLE ec_students ADD COLUMN IF NOT EXISTS father_name TEXT;');
    await client.query('ALTER TABLE ec_students ADD COLUMN IF NOT EXISTS gender TEXT;');
    await client.query('ALTER TABLE ec_students ADD COLUMN IF NOT EXISTS phone TEXT;');
    await client.query('ALTER TABLE ec_students ADD COLUMN IF NOT EXISTS address TEXT;');
    console.log('MIGRATION SUCCESSFUL: All columns added to ec_students.');
  } catch (err) {
    console.error('MIGRATION FAILED:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
