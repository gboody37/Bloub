/**
 * Base64 Database Cleansing & Supabase Storage Migration Script
 * 
 * Scans `vault_notes` for legacy base64-encoded PDF frontmatter,
 * uploads the binary PDF to Supabase Storage `media/vault_pdfs/`,
 * and replaces the multi-megabyte string with a lightweight public URL.
 * Also performs automated repair on notes with malformed frontmatter delimiters.
 */

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Client } = pg;

const POSTGRES_CONN = process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  'postgresql://postgres.gbdwswfrscjccaaeciiu:Abdodragon66-_-_@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbdwswfrscjccaaeciiu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr';

async function migrateBase64Notes() {
  console.log('\n======================================================================');
  console.log('▶ STARTING BASE64 TO SUPABASE STORAGE MIGRATION');
  console.log('======================================================================\n');

  const pgClient = new Client({ connectionString: POSTGRES_CONN });
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    await pgClient.connect();
    console.log('✔ Connected to Supabase PostgreSQL database.');

    // 1. Query notes with base64 data URLs or size > 500KB
    const queryRes = await pgClient.query(`
      SELECT id, user_id, title, path, folder, tags, content, length(content) as content_length
      FROM public.vault_notes
      WHERE content LIKE '%data:application/pdf;base64%'
         OR content LIKE '%pdf_url:%data:%'
         OR length(content) > 500000;
    `);

    console.log(`Discovered ${queryRes.rows.length} candidate note(s) for base64 migration.\n`);

    let migratedCount = 0;
    let totalBytesSaved = 0;

    for (const note of queryRes.rows) {
      const originalLen = parseInt(note.content_length, 10);
      const originalMb = (originalLen / (1024 * 1024)).toFixed(2);
      console.log(`Processing note "${note.path}" (ID: ${note.id}, Initial Size: ${originalMb} MB)...`);

      // Match base64 data URL without greedily consuming trailing delimiters
      const base64Regex = /pdf_url:\s*["']?data:application\/pdf;base64,([A-Za-z0-9+/=\r\n\t ]+?)["']?(?=\r?\n|---|$)/;
      const match = note.content.match(base64Regex);

      if (!match) {
        console.log(`  ⚠ No base64 pattern matched in note "${note.path}". Skipping.`);
        continue;
      }

      const rawBase64 = match[1].replace(/\s+/g, '');
      const binaryBuffer = Buffer.from(rawBase64, 'base64');
      console.log(`  Decoded ${binaryBuffer.length} bytes of binary PDF data.`);

      // Generate clean storage path
      const baseFileName = (note.path.split('/').pop() || 'document.pdf')
        .replace(/\.md$/i, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `vault_pdfs/${note.user_id || 'system'}/${Date.now()}_${baseFileName}`;

      // Upload binary buffer to Supabase Storage
      console.log(`  Uploading to Supabase Storage: media/${storagePath}...`);
      const { error: uploadErr } = await supabase.storage
        .from('media')
        .upload(storagePath, binaryBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadErr) {
        console.error(`  ❌ Failed to upload to Supabase Storage: ${uploadErr.message}`);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(storagePath);
      console.log(`  ✔ Uploaded. Public URL: ${publicUrl}`);

      // Replace base64 URL with public URL and ensure clean trailing newline
      let updatedContent = note.content.replace(
        base64Regex,
        `pdf_url: "${publicUrl}"\n`
      );

      // Normalize frontmatter delimiter spacing
      updatedContent = updatedContent.replace(/([^\r\n])---(\r?\n|$)/g, '$1\n---$2');

      const newLen = Buffer.byteLength(updatedContent, 'utf-8');
      const bytesSaved = originalLen - newLen;
      const newKb = (newLen / 1024).toFixed(2);

      // Update database row
      await pgClient.query(`
        UPDATE public.vault_notes
        SET content = $1,
            word_count = $2,
            updated_at = now()
        WHERE id = $3;
      `, [
        updatedContent,
        updatedContent.split(/\s+/).filter(Boolean).length,
        note.id
      ]);

      console.log(`  ✔ Successfully updated database row: Size reduced from ${originalMb} MB to ${newKb} KB (${((bytesSaved / originalLen) * 100).toFixed(2)}% reduction).\n`);
      migratedCount++;
      totalBytesSaved += bytesSaved;
    }

    // 2. Secondary Pass: Check for any notes with unspaced frontmatter delimiters and repair them
    const allNotesRes = await pgClient.query(`
      SELECT id, path, content
      FROM public.vault_notes
      WHERE content LIKE '%---%';
    `);

    let repairedCount = 0;
    for (const note of allNotesRes.rows) {
      if (!note.content) continue;
      const repaired = note.content.replace(/([^\r\n])---(\r?\n|$)/g, '$1\n---$2');
      if (repaired !== note.content) {
        await pgClient.query(`
          UPDATE public.vault_notes
          SET content = $1,
              word_count = $2,
              updated_at = now()
          WHERE id = $3;
        `, [
          repaired,
          repaired.split(/\s+/).filter(Boolean).length,
          note.id
        ]);
        console.log(`  ✔ Repaired unspaced frontmatter delimiter for "${note.path}".`);
        repairedCount++;
      }
    }
    if (repairedCount > 0) {
      console.log(`✔ Repaired frontmatter formatting for ${repairedCount} note(s).`);
    }

    const totalMbSaved = (totalBytesSaved / (1024 * 1024)).toFixed(2);
    console.log('\n======================================================================');
    console.log(`✔ MIGRATION & REPAIR COMPLETE: Migrated ${migratedCount} note(s), repaired ${repairedCount} note(s), freed ${totalMbSaved} MB of database space.`);
    console.log('======================================================================\n');

  } catch (err) {
    console.error('\n\x1b[31m❌ MIGRATION FAILED:\x1b[0m', err);
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

migrateBase64Notes();
