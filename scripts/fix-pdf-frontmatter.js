import pg from 'pg';

const { Client } = pg;

const POSTGRES_CONN = process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  'postgresql://postgres.gbdwswfrscjccaaeciiu:Abdodragon66-_-_@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function fixFrontmatter() {
  console.log('Connecting to PostgreSQL...');
  const client = new Client({ connectionString: POSTGRES_CONN });
  await client.connect();

  try {
    const res = await client.query(`
      SELECT id, path, title, content, octet_length(content) as byte_length
      FROM public.vault_notes
      WHERE path = 'Documents/1.pdf.md';
    `);

    if (res.rows.length === 0) {
      console.log('❌ Note Documents/1.pdf.md not found in database.');
      return;
    }

    const note = res.rows[0];
    console.log(`Found note ID=${note.id}, Path=${note.path}, Size=${note.byte_length} bytes`);
    console.log('Current content start:');
    console.log(JSON.stringify(note.content.slice(0, 300)));

    // Extract PDF URL
    const urlMatch = note.content.match(/https:\/\/[^\s"']+\.pdf/);
    if (!urlMatch) {
      console.error('❌ Could not find PDF URL in note content');
      return;
    }
    const pdfUrl = urlMatch[0];
    console.log(`Found PDF URL: ${pdfUrl}`);

    // Extract body text (everything after frontmatter or closing ---)
    let body = note.content;
    const fmEndIdx = note.content.indexOf('---', 3);
    if (fmEndIdx !== -1) {
      body = note.content.slice(fmEndIdx + 3).replace(/^[\r\n]+/, '');
    }

    // Construct perfectly formatted content
    const newContent = `---
title: "1.pdf"
type: "pdf"
pdf_url: "${pdfUrl}"
---

${body}`;

    const wordCount = newContent.split(/\s+/).filter(Boolean).length;

    await client.query(`
      UPDATE public.vault_notes
      SET content = $1,
          word_count = $2,
          updated_at = now()
      WHERE id = $3;
    `, [newContent, wordCount, note.id]);

    console.log('✔ Successfully updated Documents/1.pdf.md with clean YAML frontmatter.');
    
    // Verify
    const verifyRes = await client.query(`
      SELECT id, path, content FROM public.vault_notes WHERE id = $1;
    `, [note.id]);
    console.log('Verification content start:');
    console.log(JSON.stringify(verifyRes.rows[0].content.slice(0, 300)));
    console.log('\nPreview:\n' + verifyRes.rows[0].content.slice(0, 300));

  } finally {
    await client.end();
  }
}

fixFrontmatter().catch(console.error);
