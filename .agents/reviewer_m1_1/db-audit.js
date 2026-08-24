import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Client } = pg;
const POSTGRES_CONN = process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  'postgresql://postgres.gbdwswfrscjccaaeciiu:Abdodragon66-_-_@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbdwswfrscjccaaeciiu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr';

async function auditDatabase() {
  console.log('--- STARTING DATABASE & STORAGE AUDIT ---');
  const client = new Client({ connectionString: POSTGRES_CONN });
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  await client.connect();

  const startTime = Date.now();
  const res = await client.query('SELECT id, title, path, folder, length(content) as content_len, word_count, created_at, updated_at FROM public.vault_notes ORDER BY content_len DESC;');
  const latency = Date.now() - startTime;

  console.log(`Query Execution Time: ${latency} ms`);
  console.log(`Total Notes Count: ${res.rows.length}`);
  for (const r of res.rows) {
    console.log(` - Note [${r.title}] (${r.path}): ${r.content_len} bytes (~${(r.content_len / 1024).toFixed(2)} KB), words: ${r.word_count}`);
  }

  // Base64 pattern search
  const base64Check = await client.query("SELECT id, path FROM public.vault_notes WHERE content LIKE '%data:application/pdf;base64%' OR content LIKE '%base64,%';");
  console.log(`\nBase64 Pattern Matches in vault_notes: ${base64Check.rows.length}`);

  // Fetch full content of notes to inspect frontmatter and pdf_url
  const contentRes = await client.query("SELECT id, path, content FROM public.vault_notes;");
  for (const row of contentRes.rows) {
    console.log(`\n--- Note Inspection: ${row.path} ---`);
    const frontmatterMatch = row.content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (frontmatterMatch) {
      console.log('Frontmatter:', frontmatterMatch[1]);
      const pdfUrlMatch = frontmatterMatch[1].match(/pdf_url:\s*["']?([^"'\n\r]+)["']?/);
      if (pdfUrlMatch) {
        const url = pdfUrlMatch[1];
        console.log(`Found PDF URL: ${url}`);
        const httpStart = Date.now();
        const headRes = await fetch(url, { method: 'HEAD' });
        const httpLatency = Date.now() - httpStart;
        console.log(`HTTP HEAD status: ${headRes.status}, Content-Type: ${headRes.headers.get('content-type')}, Content-Length: ${headRes.headers.get('content-length')} bytes (${(parseInt(headRes.headers.get('content-length') || '0', 10) / (1024 * 1024)).toFixed(2)} MB), Latency: ${httpLatency} ms`);
      }
    } else {
      console.log('No YAML frontmatter found. Plain markdown note.');
    }
  }

  // Check storage objects in bucket
  console.log('\n--- Checking media bucket files via Supabase Storage API ---');
  const { data: objects, error: listErr } = await supabase.storage.from('media').list('vault_pdfs', { recursive: true });
  if (listErr) {
    console.error('Error listing objects:', listErr);
  } else {
    console.log(`Listed objects under vault_pdfs: ${objects?.length || 0}`);
    console.log(objects);
  }

  await client.end();
  console.log('\n--- AUDIT COMPLETE ---');
}

auditDatabase().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
