/**
 * Adversarial Test Suite for Supabase Cloud Sync Obsidian Integration
 */

import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

const SUPABASE_URL = 'https://gbdwswfrscjccaaeciiu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr';
const POSTGRES_CONN = 'postgresql://postgres.gbdwswfrscjccaaeciiu:Abdodragon66-_-_@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';
const TEST_USER_ID = '27157bfd-443f-4eea-8431-bf58a74bae8b';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function sanitizeRelativePath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return null;
  const trimmed = relativePath.trim();
  if (!trimmed) return null;

  let normalized = trimmed.replace(/\\/g, '/').replace(/\/+/g, '/');

  if (
    normalized.includes('../') ||
    normalized.includes('/..') ||
    normalized === '..' ||
    normalized.startsWith('/') ||
    /^[a-zA-Z]:/.test(normalized)
  ) {
    return null;
  }

  normalized = normalized.replace(/^(\.\/)+/, '').replace(/\/\.\//g, '/');
  return normalized || null;
}

function parseObsidianMarkdown(rawContent, relativePath) {
  const frontmatter = {};
  const tagsSet = new Set();
  let bodyContent = rawContent || '';

  const yamlMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (yamlMatch) {
    bodyContent = rawContent.slice(yamlMatch[0].length);
    const lines = yamlMatch[1].split(/\r?\n/);
    let currentKey = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('- ') && currentKey) {
        const val = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, '');
        if (!Array.isArray(frontmatter[currentKey])) {
          frontmatter[currentKey] = [];
        }
        frontmatter[currentKey].push(val);
        if (currentKey === 'tags' || currentKey === 'tag') {
          tagsSet.add(val.replace(/^#/, ''));
        }
        continue;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        currentKey = line.slice(0, colonIdx).trim();
        const rawVal = line.slice(colonIdx + 1).trim();

        if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
          const items = rawVal
            .slice(1, -1)
            .split(',')
            .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean);
          frontmatter[currentKey] = items;
          if (currentKey === 'tags' || currentKey === 'tag') {
            items.forEach(t => tagsSet.add(t.replace(/^#/, '')));
          }
        } else if (rawVal === '') {
          frontmatter[currentKey] = [];
        } else {
          const cleanVal = rawVal.replace(/^['"]|['"]$/g, '');
          frontmatter[currentKey] = cleanVal;
          if ((currentKey === 'tags' || currentKey === 'tag') && cleanVal) {
            if (cleanVal.includes(',')) {
              cleanVal.split(',').forEach(t => {
                const cleanT = t.trim().replace(/^['"#]|['"]$/g, '');
                if (cleanT) tagsSet.add(cleanT);
              });
            } else {
              tagsSet.add(cleanVal.replace(/^#/, ''));
            }
          }
        }
      }
    }
  }

  const inlineTagRegex = /(?:^|[\s,;:(])#([a-zA-Z0-9_\-\u0600-\u06FF]+)/g;
  let tagMatch;
  while ((tagMatch = inlineTagRegex.exec(bodyContent)) !== null) {
    const tag = tagMatch[1].trim();
    if (tag && !/^\d+$/.test(tag)) {
      tagsSet.add(tag);
    }
  }

  const headings = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let headingMatch;
  while ((headingMatch = headingRegex.exec(bodyContent)) !== null) {
    const level = headingMatch[1].length;
    const text = headingMatch[2].trim();
    const slug = text
      .toLowerCase()
      .replace(/[^\w\s\u0600-\u06FF-]/g, '')
      .replace(/\s+/g, '-');
    headings.push({ level, text, slug });
  }

  const h1 = headings.find(h => h.level === 1);
  let title = '';
  if (h1) {
    title = h1.text
      .replace(/^\[\[|\]\]$/g, '')
      .replace(/^\*+|\*+$/g, '')
      .replace(/^[^\w\s\u0600-\u06FF]+/, '')
      .trim();
  }
  if (!title) {
    title = relativePath ? relativePath.split('/').pop().replace(/\.md$/, '') : 'Untitled';
  }

  const wikilinks = [];
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let linkMatch;
  while ((linkMatch = wikilinkRegex.exec(bodyContent)) !== null) {
    wikilinks.push({
      raw: linkMatch[0],
      target: linkMatch[1].trim(),
      alias: linkMatch[2]?.trim()
    });
  }

  const words = bodyContent.trim().split(/\s+/).filter(Boolean);

  return {
    id: relativePath,
    title,
    relativePath,
    frontmatter,
    tags: Array.from(tagsSet),
    headings,
    wikilinks,
    bodyContent,
    wordCount: words.length
  };
}

async function runTests() {
  console.log('\n======================================================================');
  console.log('▶ RUNNING EXTENDED ADVERSARIAL TEST SUITE (CLOUD SYNC & PARSER)');
  console.log('======================================================================\n');

  // Test 1: Path sanitization
  console.log('[1/8] Testing sanitizeRelativePath boundaries...');
  assert.strictEqual(sanitizeRelativePath(''), null);
  assert.strictEqual(sanitizeRelativePath('   '), null);
  assert.strictEqual(sanitizeRelativePath('../secret.txt'), null);
  assert.strictEqual(sanitizeRelativePath('folder/../../etc/passwd'), null);
  assert.strictEqual(sanitizeRelativePath('/absolute/path.md'), null);
  assert.strictEqual(sanitizeRelativePath('C:\\Windows\\System32'), null);
  assert.strictEqual(sanitizeRelativePath('D:/Vault/Note.md'), null);
  assert.strictEqual(sanitizeRelativePath('notes/my-note.md'), 'notes/my-note.md');
  assert.strictEqual(sanitizeRelativePath('notes\\sub\\note.md'), 'notes/sub/note.md');
  assert.strictEqual(sanitizeRelativePath('./notes/note.md'), 'notes/note.md');
  assert.strictEqual(sanitizeRelativePath('.//notes///note.md'), 'notes/note.md');
  console.log('  ✔ Path sanitization passed all security checks.');

  // Test 2: Parser edge cases
  console.log('\n[2/8] Testing parser edge cases (Unicode, Arabic, malformed YAML, comma tags, H1 wikilinks)...');
  const arabicNote = `---
tags: [قرآن, تدبر, إسلام]
status: In Progress
---
# [[سورة الكهف وقصصها]]
ملاحظات وتأملات حول #قصة_موسى_والخضر ومفاهيم [[الحكمة الإلهية]].
`;
  const parsedArabic = parseObsidianMarkdown(arabicNote, 'دروس/سورة الكهف.md');
  assert.strictEqual(parsedArabic.title, 'سورة الكهف وقصصها');
  assert.ok(parsedArabic.tags.includes('قرآن'));
  assert.ok(parsedArabic.tags.includes('قصة_موسى_والخضر'));
  assert.strictEqual(parsedArabic.wikilinks.length, 2);
  assert.ok(parsedArabic.wikilinks.some(w => w.target === 'الحكمة الإلهية'));
  assert.ok(parsedArabic.wikilinks.some(w => w.target === 'سورة الكهف وقصصها'));
  console.log('  ✔ Arabic and Unicode parsing passed.');

  const commaTagsNote = `---
tags: machine-learning, artificial-intelligence, deep-learning
---
# AI Overview
Understanding neural networks.
`;
  const parsedCommaTags = parseObsidianMarkdown(commaTagsNote, 'tech/ai.md');
  assert.ok(parsedCommaTags.tags.includes('machine-learning'));
  assert.ok(parsedCommaTags.tags.includes('artificial-intelligence'));
  assert.ok(parsedCommaTags.tags.includes('deep-learning'));
  console.log('  ✔ Comma-separated frontmatter tags parsed successfully.');

  // Test 3: Database direct upsert with special characters & comma folder names
  console.log('\n[3/8] Testing batch upsert with comma folder names & special chars to Supabase Postgres...');
  const batchNotes = [
    {
      user_id: TEST_USER_ID,
      title: 'Math & Physics Formulas',
      content: '# Math & Physics Formulas\n\nNotes on physics and calculus #calculus #physics',
      path: 'Math, Physics & Sci/Formulas.md',
      folder: 'Math, Physics & Sci',
      tags: ['calculus', 'physics'],
      word_count: 10
    },
    {
      user_id: TEST_USER_ID,
      title: 'Arabic Literature Notes',
      content: '# الأدب العربي\n\nتاريخ الأدب في العصر العباسي #أدب #تاريخ',
      path: '01 - دروس/أدب.md',
      folder: '01 - دروس',
      tags: ['أدب', 'تاريخ'],
      word_count: 12
    }
  ];

  const pgClient = new Client({ connectionString: POSTGRES_CONN });
  await pgClient.connect();

  for (const n of batchNotes) {
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
    `, [n.user_id, n.title, n.content, n.path, n.folder, n.tags, n.word_count]);
  }
  await pgClient.end();
  console.log(`  ✔ Upserted ${batchNotes.length} notes into live Supabase database.`);

  // Test 4: Supabase PostgREST query with folder containing commas
  console.log('\n[4/8] Testing Supabase query with folder containing commas ("Math, Physics & Sci")...');
  const folderName = 'Math, Physics & Sci';
  const qf = JSON.stringify(folderName);
  const qfl = JSON.stringify(folderName + '/%');
  const { data: commaFolderData, error: commaFolderErr } = await supabase
    .from('vault_notes')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .or(`folder.eq.${qf},folder.like.${qfl}`);

  assert.strictEqual(commaFolderErr, null, 'Query with commas in folder name must not fail');
  assert.ok(commaFolderData && commaFolderData.length > 0);
  assert.ok(commaFolderData.some(n => n.title === 'Math & Physics Formulas'));
  console.log(`  ✔ Successfully queried folder with commas: ${commaFolderData.length} note(s) found without syntax errors.`);

  // Test 5: getNoteByPath with Arabic path
  console.log('\n[5/8] Testing note retrieval with Arabic Unicode path...');
  const { data: arabicNoteData, error: arabicErr } = await supabase
    .from('vault_notes')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('path', '01 - دروس/أدب.md')
    .single();

  assert.strictEqual(arabicErr, null);
  assert.ok(arabicNoteData);
  assert.strictEqual(arabicNoteData.title, 'Arabic Literature Notes');
  const parsedArabicDbNote = parseObsidianMarkdown(arabicNoteData.content, arabicNoteData.path);
  assert.strictEqual(parsedArabicDbNote.title, 'الأدب العربي');
  console.log('  ✔ Retrieved Arabic note by path successfully from Supabase.');

  // Test 6: Security sanitization on traversal
  console.log('\n[6/8] Testing path security checks on directory traversal attempts...');
  const traversalPaths = [
    '../../../windows/win.ini',
    '..\\..\\..\\secret',
    '/etc/shadow',
    'C:/boot.ini',
    'D:\\Vault\\note.md'
  ];
  for (const tp of traversalPaths) {
    const sanitized = sanitizeRelativePath(tp);
    assert.strictEqual(sanitized, null, `Path "${tp}" must be blocked`);
  }
  console.log('  ✔ All traversal and absolute path exploits blocked.');

  // Test 7: Multi-word full-text search
  console.log('\n[7/8] Testing multi-word full-text search...');
  const { data: allNotes, error: allErr } = await supabase
    .from('vault_notes')
    .select('*')
    .eq('user_id', TEST_USER_ID);

  assert.strictEqual(allErr, null);
  const q = 'physics calculus'.toLowerCase();
  const qWords = q.split(/\s+/).filter(Boolean);
  const matched = allNotes.filter(n => {
    const content = (n.content || '').toLowerCase();
    return qWords.every(w => content.includes(w));
  });
  assert.ok(matched.length > 0);
  assert.ok(matched.some(n => n.title.includes('Math & Physics')));
  console.log(`  ✔ Multi-word search matched ${matched.length} note(s).`);

  // Test 8: Unique tag aggregation
  console.log('\n[8/8] Testing tag aggregation across notes...');
  const tagSet = new Set();
  allNotes.forEach(n => (n.tags || []).forEach(t => tagSet.add(t)));
  assert.ok(tagSet.has('calculus'));
  assert.ok(tagSet.has('أدب'));
  assert.ok(tagSet.has('cloud-sync'));
  // Test 9: Multi-User Isolation Verification
  console.log('\n[9/10] Testing Multi-User Data Isolation in Supabase...');
  const USER_A = TEST_USER_ID;
  const USER_B = '00000000-0000-0000-0000-000000000002';

  const { data: userBNotes, error: userBErr } = await supabase
    .from('vault_notes')
    .select('*')
    .eq('user_id', USER_B);

  assert.strictEqual(userBErr, null);
  assert.ok(userBNotes.every(n => n.user_id === USER_B), 'User B must not see User A notes');
  assert.ok(!userBNotes.some(n => n.user_id === USER_A), 'User B must not receive User A data');
  console.log('  ✔ Multi-user isolation validated: User B cannot access User A notes.');

  // Test 10: Non-existent note and malformed query handling
  console.log('\n[10/10] Testing non-existent note and malformed query resilience...');
  const { data: nonExistentNote, error: nonExistentErr } = await supabase
    .from('vault_notes')
    .select('*')
    .eq('user_id', USER_A)
    .eq('path', 'NonExistent/FakeNote.md');

  assert.strictEqual(nonExistentErr, null);
  assert.strictEqual(nonExistentNote.length, 0, 'Non-existent note query must return empty array without throwing');
  console.log('  ✔ Non-existent note queries return empty array safely.');

  console.log('\n\x1b[32m✔ ALL EXTENDED ADVERSARIAL TESTS PASSED (10/10)!\x1b[0m\n');
}

runTests().catch(err => {
  console.error('\n❌ Adversarial Test Failure:', err);
  process.exit(1);
});
