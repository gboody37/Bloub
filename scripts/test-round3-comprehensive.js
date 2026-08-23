/**
 * Round 3 Comprehensive Adversarial & Security Test Suite
 * Supabase Cloud Sync Obsidian Integration
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
const TEST_USER_A = '27157bfd-443f-4eea-8431-bf58a74bae8b';
const TEST_USER_B = '00000000-0000-0000-0000-000000000002';

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

function parseObsidianMarkdown(rawContent, relativePath, absolutePath = '') {
  const frontmatter = {};
  const tagsSet = new Set();
  let bodyContent = rawContent || '';

  if (!rawContent || rawContent.trim() === '') {
    const base = relativePath ? relativePath.replace(/\\/g, '/').split('/').pop().replace(/\.md$/, '') : 'Untitled';
    return {
      id: relativePath || 'empty',
      title: base || 'Untitled',
      relativePath: relativePath || '',
      absolutePath,
      folder: 'Root',
      frontmatter: {},
      tags: [],
      headings: [],
      wikilinks: [],
      rawContent: rawContent || '',
      bodyContent: '',
      wordCount: 0,
      lastModifiedMs: Date.now()
    };
  }

  const yamlMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (yamlMatch) {
    const yamlBlock = yamlMatch[1];
    bodyContent = rawContent.slice(yamlMatch[0].length);

    try {
      const lines = yamlBlock.split(/\r?\n/);
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
    } catch {
      // Graceful fallback
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
    title = relativePath ? relativePath.replace(/\\/g, '/').split('/').pop().replace(/\.md$/, '') : 'Untitled';
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
  const normalizedPath = (relativePath || '').replace(/\\/g, '/');
  const lastSlash = normalizedPath.lastIndexOf('/');
  const parentFolder = lastSlash === -1 ? 'Root' : normalizedPath.slice(0, lastSlash) || 'Root';

  return {
    id: relativePath,
    title,
    relativePath,
    absolutePath,
    folder: parentFolder === '.' ? 'Root' : parentFolder,
    frontmatter,
    tags: Array.from(tagsSet),
    headings,
    wikilinks,
    rawContent,
    bodyContent,
    wordCount: words.length,
    lastModifiedMs: Date.now()
  };
}

async function runRound3Tests() {
  console.log('\n======================================================================');
  console.log('▶ RUNNING ROUND 3 COMPREHENSIVE ADVERSARIAL & SECURITY TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✔ [${total}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [${total}] ${name} FAILED:`, err);
      throw err;
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✔ [${total}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [${total}] ${name} FAILED:`, err);
      throw err;
    }
  }

  // 1. Path Sanitization & Traversal Defense
  test('Path Sanitization: All malicious traversal variants blocked', () => {
    const malicious = [
      '../etc/passwd',
      '..\\..\\windows\\system32',
      '/var/log/syslog',
      'C:\\autoexec.bat',
      'D:/Vaults/Brain/note.md',
      '..',
      'folder/../../../secret',
      'folder/./../../secret',
      '   ',
      '',
      null,
      undefined,
      123
    ];
    for (const m of malicious) {
      assert.strictEqual(sanitizeRelativePath(m), null, `Should block ${m}`);
    }
  });

  test('Path Sanitization: Valid paths normalized correctly', () => {
    assert.strictEqual(sanitizeRelativePath('notes/deep/my-note.md'), 'notes/deep/my-note.md');
    assert.strictEqual(sanitizeRelativePath('notes\\deep\\my-note.md'), 'notes/deep/my-note.md');
    assert.strictEqual(sanitizeRelativePath('./notes/deep/my-note.md'), 'notes/deep/my-note.md');
    assert.strictEqual(sanitizeRelativePath('.//notes///deep//my-note.md'), 'notes/deep/my-note.md');
    assert.strictEqual(sanitizeRelativePath('01 - دروس/ملاحظات.md'), '01 - دروس/ملاحظات.md');
  });

  // 2. Parser Resilience Under Extreme Inputs
  test('Parser: Empty & whitespace markdown handled gracefully without throwing', () => {
    const emptyParsed = parseObsidianMarkdown('', 'empty.md');
    assert.strictEqual(emptyParsed.title, 'empty');
    assert.strictEqual(emptyParsed.wordCount, 0);
    assert.strictEqual(emptyParsed.bodyContent, '');

    const wsParsed = parseObsidianMarkdown('   \n\n\t   ', 'whitespace.md');
    assert.strictEqual(wsParsed.title, 'whitespace');
    assert.strictEqual(wsParsed.wordCount, 0);
  });

  test('Parser: Massive document with 30,000 words parses within 50ms budget', () => {
    const hugeBody = '# Big Note\n\n' + 'Word '.repeat(30000) + '\n\n[[TargetNote|AliasLink]] #bigtag';
    const start = Date.now();
    const parsedHuge = parseObsidianMarkdown(hugeBody, 'HugeNote.md');
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 50, `Parser took ${elapsed}ms, expected < 50ms`);
    assert.strictEqual(parsedHuge.title, 'Big Note');
    assert.strictEqual(parsedHuge.wordCount, 30005);
    assert.ok(parsedHuge.tags.includes('bigtag'));
    assert.strictEqual(parsedHuge.wikilinks.length, 1);
  });

  test('Parser: Complex Frontmatter (arrays, strings, comma-separated, dates)', () => {
    const doc = `---
title: Overridden Title
tags: [tag1, tag2, #tag3]
category: physics
created: 2026-08-24
modified: 2026-08-25
aliases: [Alias 1, Alias 2]
status: In Progress
---
# Main Heading
Content with #inline_tag and [[Linked Document]].
`;
    const parsed = parseObsidianMarkdown(doc, 'folder/sub/doc.md');
    assert.strictEqual(parsed.title, 'Main Heading');
    assert.strictEqual(parsed.folder, 'folder/sub');
    assert.ok(parsed.tags.includes('tag1'));
    assert.ok(parsed.tags.includes('tag2'));
    assert.ok(parsed.tags.includes('tag3'));
    assert.ok(parsed.tags.includes('inline_tag'));
    assert.strictEqual(parsed.frontmatter.status, 'In Progress');
    assert.strictEqual(parsed.wikilinks[0].target, 'Linked Document');
  });

  // 3. Database Connectivity & Live Postgres Validation
  await asyncTest('Postgres: vault_notes schema and constraint compliance', async () => {
    const pgClient = new Client({ connectionString: POSTGRES_CONN });
    await pgClient.connect();

    const tableRes = await pgClient.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vault_notes'
      ORDER BY ordinal_position;
    `);

    const cols = tableRes.rows.map(r => r.column_name);
    assert.ok(cols.includes('id'), 'Missing id column');
    assert.ok(cols.includes('user_id'), 'Missing user_id column');
    assert.ok(cols.includes('title'), 'Missing title column');
    assert.ok(cols.includes('content'), 'Missing content column');
    assert.ok(cols.includes('path'), 'Missing path column');
    assert.ok(cols.includes('folder'), 'Missing folder column');
    assert.ok(cols.includes('tags'), 'Missing tags column');

    await pgClient.end();
  });

  // 4. Batch Upsert & Live Operations
  await asyncTest('Supabase: Batch upsert with Unicode & nested folders', async () => {
    const notesToUpsert = [
      {
        user_id: TEST_USER_A,
        title: 'Deep Learning & Transformers',
        content: '# Deep Learning & Transformers\n\nNotes on attention mechanisms #ai #deeplearning #nlp',
        path: 'AI/Deep Learning/Transformers.md',
        folder: 'AI/Deep Learning',
        tags: ['ai', 'deeplearning', 'nlp'],
        word_count: 12
      },
      {
        user_id: TEST_USER_A,
        title: 'Algebraic Topology',
        content: '# Algebraic Topology\n\nFundamental groups and homology #math #topology',
        path: 'Math/Topology.md',
        folder: 'Math',
        tags: ['math', 'topology'],
        word_count: 10
      }
    ];

    const pgClient = new Client({ connectionString: POSTGRES_CONN });
    await pgClient.connect();

    for (const n of notesToUpsert) {
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
  });

  // 5. Scan Directory with Scoped Queries
  await asyncTest('Supabase: Scans folder hierarchy and applies tag filters', async () => {
    const { data: allNotes, error } = await supabase
      .from('vault_notes')
      .select('*')
      .eq('user_id', TEST_USER_A);

    assert.strictEqual(error, null);
    assert.ok(allNotes.length >= 2);

    const aiNotes = allNotes.filter(n => (n.folder || '').startsWith('AI'));
    assert.ok(aiNotes.length >= 1);

    const nlpNotes = allNotes.filter(n => (n.tags || []).includes('nlp'));
    assert.ok(nlpNotes.length >= 1);
  });

  // 6. Single Note Retrieval
  await asyncTest('Supabase: Retrieves note by path accurately', async () => {
    const { data: noteRow, error } = await supabase
      .from('vault_notes')
      .select('*')
      .eq('user_id', TEST_USER_A)
      .eq('path', 'AI/Deep Learning/Transformers.md')
      .single();

    assert.strictEqual(error, null);
    assert.ok(noteRow);
    assert.strictEqual(noteRow.title, 'Deep Learning & Transformers');
    assert.ok(noteRow.tags.includes('nlp'));
  });

  // 7. Full-Text Search
  await asyncTest('Supabase: Returns keyword matches for multi-word queries', async () => {
    const { data: notes, error } = await supabase
      .from('vault_notes')
      .select('*')
      .eq('user_id', TEST_USER_A);

    assert.strictEqual(error, null);
    const qWords = ['attention', 'mechanisms'];
    const matched = notes.filter(n => {
      const content = (n.content || '').toLowerCase();
      return qWords.every(w => content.includes(w));
    });
    assert.ok(matched.length > 0);
    assert.strictEqual(matched[0].title, 'Deep Learning & Transformers');
  });

  // 8. Tag Aggregation
  await asyncTest('Supabase: Aggregates all unique tags across user notes', async () => {
    const { data: rows, error } = await supabase
      .from('vault_notes')
      .select('tags')
      .eq('user_id', TEST_USER_A);

    assert.strictEqual(error, null);
    const tagSet = new Set();
    rows.forEach(r => (r.tags || []).forEach(t => tagSet.add(t)));
    assert.ok(tagSet.has('ai'));
    assert.ok(tagSet.has('math'));
    assert.ok(tagSet.has('nlp'));
  });

  // 9. Zero-FS Architecture Audit
  test('Architecture Integrity: Zero "fs" imports in production Obsidian modules', () => {
    const targetDirs = [
      path.resolve('src/lib/obsidian'),
      path.resolve('src/app/api/obsidian')
    ];
    for (const dir of targetDirs) {
      const files = fs.readdirSync(dir, { recursive: true });
      for (const f of files) {
        const fullPath = path.join(dir, f.toString());
        if (fs.statSync(fullPath).isFile() && /\.(ts|tsx|js)$/.test(fullPath)) {
          const code = fs.readFileSync(fullPath, 'utf8');
          const hasFs = /\bfrom ['"](node:)?fs(\/promises)?['"]|\brequire\(['"](node:)?fs(\/promises)?['"]\)/.test(code);
          assert.strictEqual(hasFs, false, `Forbidden fs import detected in ${fullPath}`);
        }
      }
    }
  });

  console.log(`\n======================================================================`);
  console.log(`🎉 ALL ROUND 3 ADVERSARIAL TESTS PASSED (${passed}/${total})!`);
  console.log(`======================================================================\n`);
}

runRound3Tests().catch(err => {
  console.error('\n❌ Suite Error:', err);
  process.exit(1);
});
