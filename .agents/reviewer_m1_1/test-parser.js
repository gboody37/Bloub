import pg from 'pg';
import { parseObsidianMarkdown } from '../../src/lib/obsidian/parser.js';

const { Client } = pg;
const POSTGRES_CONN = process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  'postgresql://postgres.gbdwswfrscjccaaeciiu:Abdodragon66-_-_@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function testParser() {
  const client = new Client({ connectionString: POSTGRES_CONN });
  await client.connect();

  const res = await client.query("SELECT id, title, path, content FROM public.vault_notes WHERE path = 'Documents/1.pdf.md';");
  const noteRow = res.rows[0];

  const parsed = parseObsidianMarkdown(noteRow.content, noteRow.path);
  console.log('Parsed note:');
  console.log('Title:', parsed.title);
  console.log('Frontmatter:', parsed.frontmatter);
  console.log('PDF URL from frontmatter:', parsed.frontmatter?.pdf_url);
  console.log('Body length:', parsed.bodyContent.length);
  console.log('Word count:', parsed.wordCount);

  await client.end();
}

testParser().catch(console.error);
