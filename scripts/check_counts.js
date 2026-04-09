const { Client } = require('pg');

const client = new Client({
  connectionString: "postgres://postgres:admin@localhost:5432/college_erp"
});

async function check() {
  await client.connect();
  const tables = ['ec_students', 'ec_results', 'ec_admins', 'ec_subjects'];
  console.log('Record Counts:');
  for (const table of tables) {
    const res = await client.query(`SELECT count(*) FROM public.${table}`);
    console.log(`${table}: ${res.rows[0].count}`);
  }
  await client.end();
}

check().catch(console.error);
