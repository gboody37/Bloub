const supabaseUrl = 'https://gbdwswfrscjccaaeciiu.supabase.co';
const supabaseAnonKey = 'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr';

const headers = {
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json'
};

// We need to use the Supabase REST API to run this SQL via the management API
// Since we can't run raw SQL via REST, let's use the pg direct connection instead

import pg from 'pg';
const { Client } = pg;

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Abdodragon66-_-_@db.gbdwswfrscjccaaeciiu.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    console.log('Connected to Postgres directly!');
    
    await client.query(`
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS type text DEFAULT 'todo';
    `);
    console.log('Added type column to categories successfully.');

    // Also add attachments column if missing
    await client.query(`
      ALTER TABLE todos ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('Added attachments column to todos successfully.');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
