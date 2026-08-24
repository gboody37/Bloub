import pg from 'pg';
import { parseObsidianMarkdown } from '../../src/lib/obsidian/parser';

const { Client } = pg;
const POSTGRES_CONN = process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  'postgresql://postgres.gbdwswfrscjccaaeciiu:Abdodragon66-_-_@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function investigateFrontmatter() {
  const client = new Client({ connectionString: POSTGRES_CONN });
  await client.connect();

  const res = await client.query("SELECT id, title, path, content FROM public.vault_notes WHERE path = 'Documents/1.pdf.md';");
  const noteRow = res.rows[0];
  const first200 = noteRow.content.slice(0, 200);
  console.log('First 200 raw chars JSON encoded:', JSON.stringify(first200));

  console.log('\nTesting parseObsidianMarkdown on current DB content:');
  const parsedCurrent = parseObsidianMarkdown(noteRow.content, noteRow.path);
  console.log('parsedCurrent.frontmatter:', parsedCurrent.frontmatter);

  const fixedContent = noteRow.content.replace('1787578638569_1.pdf"---', '1787578638569_1.pdf"\n---');
  console.log('\nTesting parseObsidianMarkdown on fixed content with newline before closing ---:');
  const parsedFixed = parseObsidianMarkdown(fixedContent, noteRow.path);
  console.log('parsedFixed.frontmatter:', parsedFixed.frontmatter);
  console.log('parsedFixed.frontmatter.pdf_url:', parsedFixed.frontmatter.pdf_url);

  await client.end();
}

investigateFrontmatter().catch(console.error);
