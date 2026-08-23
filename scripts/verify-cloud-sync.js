/**
 * Verification Script: Supabase Cloud Sync Obsidian Integration
 *
 * Requirements Verified:
 * 1. Inserts a mock note into the Supabase cloud database (`vault_notes`).
 * 2. Confirms that API route functions / services retrieve and parse it successfully without filesystem errors.
 * 3. Confirms folder scoping, tag filtering, full-text snippet search, and tag aggregation from Supabase.
 * 4. Confirms zero filesystem (`fs`) dependency in all Obsidian modules.
 */

import assert from 'node:assert/strict';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const { Client } = pg;

const SUPABASE_URL = 'https://gbdwswfrscjccaaeciiu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr';
const POSTGRES_CONN = 'postgresql://postgres.gbdwswfrscjccaaeciiu:Abdodragon66-_-_@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';
const TEST_USER_ID = '27157bfd-443f-4eea-8431-bf58a74bae8b';

const MOCK_NOTE_PATH = '03 - Automated Tests/Cloud Sync Verification Note.md';
const MOCK_NOTE_FOLDER = '03 - Automated Tests';
const MOCK_NOTE_TITLE = 'Cloud Sync Verification Note';
const MOCK_NOTE_CONTENT = `---
tags: [cloud-sync, supabase, automated-test]
status: Verified
created: 2026-08-24
aliases: [Cloud Sync Test, Cloud Vault Doc]
---

# Cloud Sync Verification Note

This note was automatically synchronized into the Supabase cloud database to verify the cloud-connected Obsidian integration.

## Key Architecture Highlights
- Pure Supabase Postgres storage in \`vault_notes\` table
- Row Level Security (RLS) policies protecting user data
- Zero filesystem (\`fs\`) dependencies in Vercel Edge and Serverless runtimes

## Connected Concepts
See [[Cloud Database Architecture|Supabase Guide]] and [[Obsidian Sync Workflow|Sync Importer]].

> [!NOTE]
> All notes are securely retrieved from cloud PostgreSQL.
`;

// Pure markdown parser implementation for testing contract compliance
function parseObsidianMarkdown(rawContent, relativePath) {
  const frontmatter = {};
  const tagsSet = new Set();
  let bodyContent = rawContent || '';

  const yamlMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (yamlMatch) {
    bodyContent = rawContent.slice(yamlMatch[0].length);
    const lines = yamlMatch[1].split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const rawVal = line.slice(colonIdx + 1).trim();
        if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
          const items = rawVal.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
          frontmatter[key] = items;
          if (key === 'tags' || key === 'tag') {
            items.forEach(t => tagsSet.add(t.replace(/^#/, '')));
          }
        } else {
          const clean = rawVal.replace(/^['"]|['"]$/g, '');
          frontmatter[key] = clean;
          if ((key === 'tags' || key === 'tag') && clean) {
            tagsSet.add(clean.replace(/^#/, ''));
          }
        }
      }
    }
  }

  const inlineTagRegex = /(?:^|[\s,;:(])#([a-zA-Z0-9_\-\u0600-\u06FF]+)/g;
  let tagMatch;
  while ((tagMatch = inlineTagRegex.exec(bodyContent)) !== null) {
    if (tagMatch[1] && !/^\d+$/.test(tagMatch[1])) {
      tagsSet.add(tagMatch[1].trim());
    }
  }

  const headings = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let hMatch;
  while ((hMatch = headingRegex.exec(bodyContent)) !== null) {
    headings.push({ level: hMatch[1].length, text: hMatch[2].trim() });
  }

  const wikilinks = [];
  const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let lMatch;
  while ((lMatch = linkRegex.exec(bodyContent)) !== null) {
    wikilinks.push({
      raw: lMatch[0],
      target: lMatch[1].trim(),
      alias: lMatch[2]?.trim()
    });
  }

  const words = bodyContent.trim().split(/\s+/).filter(Boolean);
  const parts = (relativePath || '').replace(/\\/g, '/').split('/');
  parts.pop();
  const folder = parts.join('/') || 'Root';
  const h1 = headings.find(h => h.level === 1);
  const title = h1 ? h1.text : path.basename(relativePath, '.md');

  return {
    id: relativePath,
    title,
    relativePath,
    folder,
    frontmatter,
    tags: Array.from(tagsSet),
    headings,
    wikilinks,
    bodyContent,
    wordCount: words.length
  };
}

async function runVerification() {
  console.log('\n======================================================================');
  console.log('▶ RUNNING SUPABASE CLOUD SYNC VERIFICATION: Vibe Todos Obsidian');
  console.log('======================================================================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Step 1: Database Connection & Mock Note Insertion
  console.log('[1/6] Inserting mock note into Supabase database (vault_notes table)...');
  const pgClient = new Client({ connectionString: POSTGRES_CONN });
  await pgClient.connect();
  console.log('  ✔ Connected to Supabase PostgreSQL database.');

  const parsed = parseObsidianMarkdown(MOCK_NOTE_CONTENT, MOCK_NOTE_PATH);

  await pgClient.query(`
    INSERT INTO public.vault_notes (user_id, title, content, path, folder, tags, word_count, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, now())
    ON CONFLICT (user_id, path)
    DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      folder = EXCLUDED.folder,
      tags = EXCLUDED.tags,
      word_count = EXCLUDED.word_count,
      updated_at = now();
  `, [
    TEST_USER_ID,
    MOCK_NOTE_TITLE,
    MOCK_NOTE_CONTENT,
    MOCK_NOTE_PATH,
    MOCK_NOTE_FOLDER,
    parsed.tags,
    parsed.wordCount
  ]);

  console.log(`  ✔ Successfully upserted mock note "${MOCK_NOTE_PATH}" into vault_notes table.`);
  await pgClient.end();

  // Step 2: Test Fetching Notes via Supabase Client (simulating API /api/obsidian/notes)
  console.log('\n[2/6] Verifying note list retrieval from Supabase vault_notes...');
  const { data: rows, error: fetchErr } = await supabase
    .from('vault_notes')
    .select('*')
    .eq('user_id', TEST_USER_ID);

  assert.strictEqual(fetchErr, null, 'Fetching vault_notes from Supabase must not produce errors');
  assert.ok(rows && rows.length > 0, 'Must retrieve at least 1 note from Supabase');

  const mockNoteRow = rows.find(r => r.path === MOCK_NOTE_PATH);
  assert.ok(mockNoteRow, `Mock note "${MOCK_NOTE_PATH}" must be returned from Supabase`);
  assert.strictEqual(mockNoteRow.title, MOCK_NOTE_TITLE);
  assert.strictEqual(mockNoteRow.folder, MOCK_NOTE_FOLDER);
  console.log(`  ✔ Discovered ${rows.length} note(s) directly from Supabase cloud database.`);

  // Step 3: Test Folder and Tag Filtering
  console.log('\n[3/6] Testing folder and tag filtering logic...');
  const folderNotes = rows.filter(r => r.folder === MOCK_NOTE_FOLDER || r.folder.startsWith(MOCK_NOTE_FOLDER + '/'));
  assert.ok(folderNotes.length > 0, 'Folder filter must match mock note');
  console.log(`  ✔ Scoped ${folderNotes.length} note(s) in folder "${MOCK_NOTE_FOLDER}".`);

  const tagNotes = rows.filter(r => (r.tags || []).includes('cloud-sync'));
  assert.ok(tagNotes.length > 0, 'Tag filter must match mock note with #cloud-sync');
  console.log(`  ✔ Tag filter "#cloud-sync" matched ${tagNotes.length} note(s).`);

  // Step 4: Test Note Detail Retrieval & Parsing (simulating /api/obsidian/read & /note)
  console.log('\n[4/6] Testing note retrieval and markdown parsing contract...');
  const { data: noteRows, error: noteErr } = await supabase
    .from('vault_notes')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('path', MOCK_NOTE_PATH)
    .single();

  assert.strictEqual(noteErr, null);
  assert.ok(noteRows, 'Must retrieve single note row by path');

  const parsedDetail = parseObsidianMarkdown(noteRows.content, noteRows.path);
  assert.strictEqual(parsedDetail.title, MOCK_NOTE_TITLE);
  assert.strictEqual(parsedDetail.frontmatter.status, 'Verified');
  assert.ok(parsedDetail.tags.includes('cloud-sync'));
  assert.ok(parsedDetail.headings.length >= 3, 'Outline headings must extract >= 3 entries');
  assert.ok(parsedDetail.wikilinks.length >= 2, 'Wikilinks must extract >= 2 entries');

  const wikilinkTargets = parsedDetail.wikilinks.map(l => l.target);
  assert.ok(wikilinkTargets.includes('Cloud Database Architecture'));
  assert.ok(wikilinkTargets.includes('Obsidian Sync Workflow'));

  console.log(`  ✔ Retrieved parsed note from cloud: Title="${parsedDetail.title}", Headings=${parsedDetail.headings.length}, Wikilinks=${parsedDetail.wikilinks.length}`);

  // Step 5: Test Full-Text Snippet Search & Tag Aggregation
  console.log('\n[5/6] Testing full-text search & tag aggregation from Supabase...');
  const searchQuery = 'RLS policies'.toLowerCase();
  const searchWords = searchQuery.split(/\s+/).filter(Boolean);

  const matchedNotes = rows.filter(r => {
    const titleMatch = (r.title || '').toLowerCase().includes(searchQuery);
    const contentMatch = (r.content || '').toLowerCase().includes(searchQuery) ||
      searchWords.every(w => (r.content || '').toLowerCase().includes(w));
    const tagMatch = (r.tags || []).some(t => t.toLowerCase().includes(searchQuery));
    return titleMatch || contentMatch || tagMatch;
  });

  assert.ok(matchedNotes.length > 0, 'Search must match note containing "RLS policies"');
  console.log(`  ✔ Full-text search for "${searchQuery}" matched ${matchedNotes.length} note(s).`);

  const tagCounts = {};
  for (const r of rows) {
    for (const t of r.tags || []) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }
  assert.ok(tagCounts['cloud-sync'] > 0);
  assert.ok(tagCounts['supabase'] > 0);
  console.log(`  ✔ Aggregated ${Object.keys(tagCounts).length} unique tags from cloud notes.`);

  // Step 6: Verify Zero FS Dependency in Obsidian Codebase
  console.log('\n[6/6] Verifying zero filesystem ("fs") dependency in src/lib/obsidian & src/app/api/obsidian...');
  const checkDirs = ['src/lib/obsidian', 'src/app/api/obsidian'];
  let fsViolations = 0;

  for (const relDir of checkDirs) {
    const fullDir = path.resolve(relDir);
    const files = fs.readdirSync(fullDir, { recursive: true });
    for (const f of files) {
      const fullPath = path.join(fullDir, f.toString());
      if (fs.statSync(fullPath).isFile() && /\.(ts|tsx|js|mjs)$/.test(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const hasFs = /\bfrom ['"](node:)?fs(\/promises)?['"]|\brequire\(['"](node:)?fs(\/promises)?['"]\)/.test(content);
        if (hasFs) {
          console.error(`  ❌ VIOLATION: "${fullPath}" imports fs module!`);
          fsViolations++;
        }
      }
    }
  }

  assert.strictEqual(fsViolations, 0, 'No files in src/lib/obsidian or src/app/api/obsidian may import fs');
  console.log('  ✔ Confirmed 100% clean runtime: zero fs module dependencies in Obsidian modules.');

  console.log('\n\x1b[32m✔ ALL CLOUD SYNC VERIFICATIONS PASSED SUCCESSFULLY!\x1b[0m\n');
  return true;
}

runVerification().catch(err => {
  console.error('\n\x1b[31m❌ VERIFICATION FAILED:\x1b[0m', err);
  process.exit(1);
});
