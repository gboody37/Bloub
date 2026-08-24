import pg from 'pg';

const { Client } = pg;
const POSTGRES_CONN = process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  'postgresql://postgres.gbdwswfrscjccaaeciiu:Abdodragon66-_-_@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function checkNoteDetails() {
  const client = new Client({ connectionString: POSTGRES_CONN });
  await client.connect();

  const res = await client.query("SELECT id, title, path, content FROM public.vault_notes WHERE path = 'Documents/1.pdf.md';");
  const note = res.rows[0];
  if (!note) {
    console.log('Note not found!');
  } else {
    console.log('Title:', note.title);
    console.log('Path:', note.path);
    console.log('Content length:', note.content.length);
    console.log('--- Content start (first 1000 chars) ---');
    console.log(note.content.substring(0, 1000));
    console.log('--- Content end (last 300 chars) ---');
    console.log(note.content.substring(note.content.length - 300));
  }

  await client.end();
}

checkNoteDetails().catch(console.error);
