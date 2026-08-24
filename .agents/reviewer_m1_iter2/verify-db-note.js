import pg from 'pg';
import { parseObsidianMarkdown } from '../../src/lib/obsidian/parser.ts';

const { Client } = pg;
const POSTGRES_CONN = process.env.POSTGRES_URL || 'postgresql://postgres.gbdwswfrscjccaaeciiu:Abdodragon66-_-_@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function testLiveDbNote() {
  const client = new Client({ connectionString: POSTGRES_CONN });
  await client.connect();

  const res = await client.query(`
    SELECT id, path, content
    FROM public.vault_notes
    WHERE path = 'Documents/1.pdf.md';
  `);

  if (res.rows.length === 0) {
    console.error('Note Documents/1.pdf.md not found in database!');
    process.exit(1);
  }

  const row = res.rows[0];
  const parsed = parseObsidianMarkdown(row.content, row.path);

  console.log('--- DB NOTE PARSING RESULTS ---');
  console.log('Path:', parsed.relativePath);
  console.log('Resolved Title:', parsed.title);
  console.log('Extracted Frontmatter:', parsed.frontmatter);
  console.log('PDF URL:', parsed.frontmatter.pdf_url);
  console.log('Has PDF URL?:', Boolean(parsed.frontmatter.pdf_url));
  console.log('Body length (characters):', parsed.bodyContent.length);
  console.log('Word count:', parsed.wordCount);
  console.log('Body starts with frontmatter delimiter?:', parsed.bodyContent.trim().startsWith('---'));

  if (!parsed.frontmatter.pdf_url) {
    console.error('CRITICAL: pdf_url is missing or undefined!');
    process.exit(1);
  }

  if (parsed.bodyContent.trim().startsWith('---')) {
    console.error('CRITICAL: bodyContent still contains frontmatter delimiters!');
    process.exit(1);
  }

  console.log('✔ All live DB note assertions passed perfectly!');
  await client.end();
}

testLiveDbNote().catch((e) => {
  console.error(e);
  process.exit(1);
});
