const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Abdodragon66-_-_@db.gbdwswfrscjccaaeciiu.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    console.log('Connected to Postgres directly!');
    
    await client.query(`
      ALTER TABLE todos ADD COLUMN IF NOT EXISTS subtasks jsonb DEFAULT '[]'::jsonb;
    `);
    console.log('Added subtasks column successfully.');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
