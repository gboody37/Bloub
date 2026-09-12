import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbdwswfrscjccaaeciiu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentic items contract
const CANONICAL_AUTHENTIC_TITLES = ['Deen', 'English', 'Deen 2.0', 'History', 'AI'];

// Synthetic items blacklisted
const SYNTHETIC_MARKERS = [
  'optics & quantum',
  'photoelectric effect',
  'modern physics complete',
  'wave mechanics & de broglie',
  'tawjihi 2024 physics revision guide'
];

/**
 * Mirror of CozyBooksAndNotes.tsx sanitization logic
 */
const isSyntheticItem = (item: { title?: string }): boolean => {
  const title = (item.title || '').toLowerCase();
  return (
    title.includes('optics & quantum') ||
    title.includes('photoelectric effect') ||
    title.includes('modern physics complete') ||
    title.includes('wave mechanics & de broglie') ||
    title.includes('tawjihi 2024 physics revision guide')
  );
};

const sanitizeItems = <T extends { title?: string }>(raw: T[]): T[] => {
  return raw.filter(i => !isSyntheticItem(i));
};

/**
 * Mirror of frontmatter parsing logic in CozyBooksAndNotes.tsx
 */
const extractFrontmatterPdfUrl = (content?: string): string | undefined => {
  if (!content || typeof content !== 'string') return undefined;
  const pdfMatch = content.match(/pdf_url:\s*["']?([^"'\r\n]+)["']?/);
  return pdfMatch ? pdfMatch[1].trim() : undefined;
};

/**
 * Mirror of filename cleaning logic in CozyBooksAndNotes.tsx and NoteExplorer.tsx
 */
const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
};

// ============================================================================
// SUITE 1: Supabase Storage Resilience & Boundary Stress
// ============================================================================
describe('Suite 1: Supabase Storage Resilience & Concurrency Stress', () => {

  test('1.1: Rapid concurrent uploads (10 simultaneous probes to media bucket)', async () => {
    const concurrency = 10;
    const batchId = `concurrent_${Date.now()}`;
    const uploadedPaths: string[] = [];

    try {
      const uploadPromises = Array.from({ length: concurrency }, async (_, i) => {
        const probePath = `vault_pdfs/verification/${batchId}_probe_${i}.txt`;
        const payload = `Concurrent Probe Payload ${i} — Batch: ${batchId} — Timestamp: ${new Date().toISOString()}`;
        const buffer = Buffer.from(payload, 'utf-8');

        // Step 1: Upload
        const { error: uploadErr } = await supabase.storage
          .from('media')
          .upload(probePath, buffer, {
            contentType: 'text/plain',
            upsert: true
          });

        assert.strictEqual(uploadErr, null, `Probe ${i} upload failed: ${uploadErr?.message}`);
        uploadedPaths.push(probePath);

        // Step 2: Get Public URL
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(probePath);
        assert.ok(urlData?.publicUrl, `Probe ${i} public URL must be defined`);

        // Step 3: Fetch & verify payload
        const res = await fetch(urlData.publicUrl);
        assert.strictEqual(res.status, 200, `Probe ${i} HTTP GET returned status ${res.status}`);
        const fetchedText = await res.text();
        assert.strictEqual(fetchedText, payload, `Probe ${i} payload mismatch`);

        return { index: i, url: urlData.publicUrl };
      });

      const results = await Promise.all(uploadPromises);
      assert.strictEqual(results.length, concurrency, 'All concurrent uploads must succeed');
    } finally {
      // Cleanup all uploaded probes
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('media').remove(uploadedPaths);
      }
    }
  });

  test('1.2: Boundary filename testing with spaces', async () => {
    const timestamp = Date.now();
    const rawFileName = `Draft Note Physics 2026 Revision (Final Version).pdf`;
    const cleanName = sanitizeFileName(rawFileName);
    const probePath = `vault_pdfs/verification/spaces_${timestamp}_${cleanName}`;
    const payload = `Test payload with spaces in filename: ${rawFileName}`;

    try {
      const { error: uploadErr } = await supabase.storage
        .from('media')
        .upload(probePath, Buffer.from(payload, 'utf-8'), {
          contentType: 'application/pdf',
          upsert: true
        });

      assert.strictEqual(uploadErr, null, `Upload with spaces failed: ${uploadErr?.message}`);

      const { data } = supabase.storage.from('media').getPublicUrl(probePath);
      const res = await fetch(data.publicUrl);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(await res.text(), payload);
    } finally {
      await supabase.storage.from('media').remove([probePath]);
    }
  });

  test('1.3: Boundary filename testing with Arabic characters', async () => {
    const timestamp = Date.now();
    const rawFileName = `ملخص_التربية_الإسلامية_توجيهي_2026.pdf`;
    const cleanName = sanitizeFileName(rawFileName);
    const probePath = `vault_pdfs/verification/arabic_${timestamp}_${cleanName}`;
    const payload = `Arabic filename payload for ${rawFileName}`;

    try {
      const { error: uploadErr } = await supabase.storage
        .from('media')
        .upload(probePath, Buffer.from(payload, 'utf-8'), {
          contentType: 'application/pdf',
          upsert: true
        });

      assert.strictEqual(uploadErr, null, `Upload with Arabic filename failed: ${uploadErr?.message}`);

      const { data } = supabase.storage.from('media').getPublicUrl(probePath);
      const res = await fetch(data.publicUrl);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(await res.text(), payload);
    } finally {
      await supabase.storage.from('media').remove([probePath]);
    }
  });

  test('1.4: Boundary filename testing with punctuation, symbols & quotes', async () => {
    const timestamp = Date.now();
    const rawFileName = `[Doc #1] - AI & Neural Nets + Vision! (v2.0) 'final'.pdf`;
    const cleanName = sanitizeFileName(rawFileName);
    const probePath = `vault_pdfs/verification/punct_${timestamp}_${cleanName}`;
    const payload = `Complex punctuation payload for ${rawFileName}`;

    try {
      const { error: uploadErr } = await supabase.storage
        .from('media')
        .upload(probePath, Buffer.from(payload, 'utf-8'), {
          contentType: 'application/pdf',
          upsert: true
        });

      assert.strictEqual(uploadErr, null, `Upload with complex punctuation failed: ${uploadErr?.message}`);

      const { data } = supabase.storage.from('media').getPublicUrl(probePath);
      const res = await fetch(data.publicUrl);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(await res.text(), payload);
    } finally {
      await supabase.storage.from('media').remove([probePath]);
    }
  });

  test('1.5: Filename sanitizer stress (15 adversarial filenames)', () => {
    const adversarialNames = [
      '../../etc/passwd.pdf',
      '..\\..\\windows\\system32.pdf',
      'spaces and more spaces.pdf',
      'ملخص لغة عربية.pdf',
      'emoji_test_📄_🚀.pdf',
      'symbols_#_&_%_$_@_!_?.pdf',
      'quotes_"single\'`backtick`.pdf',
      'control_\x00_\x1F_\x7F.pdf',
      '.hidden_file.pdf',
      'multiple...dots...and...ext.pdf',
      'slashes/and\\backslashes.pdf',
      'colons:and;semicolons.pdf',
      'tabs\tand\nnewlines.pdf',
      'a'.repeat(250) + '.pdf',
      '   leading_and_trailing_spaces   .pdf'
    ];

    for (const name of adversarialNames) {
      const sanitized = sanitizeFileName(name);
      // Ensure only permitted characters [a-zA-Z0-9._-]
      const illegalMatch = sanitized.match(/[^a-zA-Z0-9._-]/);
      assert.strictEqual(illegalMatch, null, `Sanitized name "${sanitized}" contains illegal characters for "${name}"`);
      // Ensure no path traversal components survive
      assert.ok(!sanitized.includes('/'), `Sanitized name must not contain slashes: ${sanitized}`);
      assert.ok(!sanitized.includes('\\'), `Sanitized name must not contain backslashes: ${sanitized}`);
    }
  });
});

// ============================================================================
// SUITE 2: Authentic Notes Query & Remote Database Integrity
// ============================================================================
describe('Suite 2: Authentic Notes Query & Remote Database Integrity', () => {

  test('2.1: Live query on public.vault_notes table returns valid rows', async () => {
    const { data, error } = await supabase
      .from('vault_notes')
      .select('*')
      .order('updated_at', { ascending: false });

    assert.strictEqual(error, null, `vault_notes query failed: ${error?.message}`);
    assert.ok(Array.isArray(data), 'vault_notes data must be an array');
    assert.ok(data.length >= 5, `Expected at least 5 authentic notes, got ${data.length}`);
  });

  test('2.2: Authentic curriculum completeness (Deen, English, Deen 2.0, History, AI)', async () => {
    const { data, error } = await supabase
      .from('vault_notes')
      .select('id, title, content, path');

    assert.strictEqual(error, null);
    const titles = data?.map(r => r.title) || [];

    for (const requiredTitle of CANONICAL_AUTHENTIC_TITLES) {
      const exists = titles.includes(requiredTitle);
      assert.ok(exists, `Required authentic curriculum document "${requiredTitle}" missing from vault_notes. Found: ${JSON.stringify(titles)}`);
    }
  });

  test('2.3: Zero synthetic physics placeholders present in remote database', async () => {
    const { data, error } = await supabase
      .from('vault_notes')
      .select('id, title, content');

    assert.strictEqual(error, null);

    for (const row of (data || [])) {
      const titleLower = (row.title || '').toLowerCase();
      const contentLower = (row.content || '').toLowerCase();

      for (const marker of SYNTHETIC_MARKERS) {
        assert.ok(
          !titleLower.includes(marker),
          `Row ${row.id} ("${row.title}") contains synthetic marker "${marker}" in title`
        );
        assert.ok(
          !contentLower.includes(marker),
          `Row ${row.id} ("${row.title}") contains synthetic marker "${marker}" in content`
        );
      }
    }
  });

  test('2.4: PDF URLs in authentic rows point to valid Supabase CDN storage endpoints', async () => {
    const { data, error } = await supabase
      .from('vault_notes')
      .select('id, title, content');

    assert.strictEqual(error, null);
    const pdfNotes = (data || []).filter(r => CANONICAL_AUTHENTIC_TITLES.includes(r.title));

    for (const note of pdfNotes) {
      const pdfUrl = extractFrontmatterPdfUrl(note.content);
      assert.ok(pdfUrl, `Authentic note "${note.title}" must have extractable pdf_url in frontmatter`);
      assert.ok(
        pdfUrl.startsWith('https://gbdwswfrscjccaaeciiu.supabase.co/storage/v1/object/public/media/'),
        `Note "${note.title}" pdf_url must target production media bucket. Got: ${pdfUrl}`
      );
    }
  });
});

// ============================================================================
// SUITE 3: Frontmatter Parsing Resilience Under Adversarial / Corrupted YAML
// ============================================================================
describe('Suite 3: Frontmatter Parsing Resilience Under Adversarial / Corrupted YAML', () => {

  test('3.1: Standard valid double-quoted, single-quoted, and unquoted pdf_url', () => {
    const testCases = [
      {
        raw: `---\ntitle: "Physics"\npdf_url: "https://example.com/doc.pdf"\n---`,
        expected: 'https://example.com/doc.pdf'
      },
      {
        raw: `---\ntitle: 'Chemistry'\npdf_url: 'https://example.com/chem.pdf'\n---`,
        expected: 'https://example.com/chem.pdf'
      },
      {
        raw: `---\ntitle: Biology\npdf_url: https://example.com/bio.pdf\n---`,
        expected: 'https://example.com/bio.pdf'
      }
    ];

    for (const tc of testCases) {
      const parsed = extractFrontmatterPdfUrl(tc.raw);
      assert.strictEqual(parsed, tc.expected);
    }
  });

  test('3.2: Irregular whitespace and tab variations', () => {
    const testCases = [
      `---\npdf_url:    "https://example.com/spaced.pdf"   \n---`,
      `---\npdf_url:\t\t"https://example.com/tabbed.pdf"\n---`,
      `---\n  pdf_url: "https://example.com/indented.pdf"\n---`,
      `---\r\npdf_url: "https://example.com/crlf.pdf"\r\n---`
    ];

    for (const raw of testCases) {
      const parsed = extractFrontmatterPdfUrl(raw);
      assert.ok(parsed?.startsWith('https://example.com/'), `Failed to parse: ${raw}`);
    }
  });

  test('3.3: Adversarial / corrupted YAML delimiters (missing closing, unclosed fences)', () => {
    // Missing closing fence
    const unclosed = `---\ntitle: "Corrupted"\npdf_url: "https://example.com/open.pdf"\nSome body text without closing`;
    assert.strictEqual(extractFrontmatterPdfUrl(unclosed), 'https://example.com/open.pdf');

    // No frontmatter delimiters at all, but text mentions pdf_url
    const rawText = `Here is a note that mentions pdf_url: "https://example.com/mention.pdf" in the body`;
    assert.strictEqual(extractFrontmatterPdfUrl(rawText), 'https://example.com/mention.pdf');

    // Multiple fences
    const multiFence = `---\nfoo: bar\n---\n---\npdf_url: "https://example.com/multi.pdf"\n---`;
    assert.strictEqual(extractFrontmatterPdfUrl(multiFence), 'https://example.com/multi.pdf');
  });

  test('3.4: Null, undefined, empty, and non-string inputs survive safely', () => {
    assert.strictEqual(extractFrontmatterPdfUrl(undefined), undefined);
    assert.strictEqual(extractFrontmatterPdfUrl(''), undefined);
    assert.strictEqual(extractFrontmatterPdfUrl(null as any), undefined);
    assert.strictEqual(extractFrontmatterPdfUrl(12345 as any), undefined);
    assert.strictEqual(extractFrontmatterPdfUrl({} as any), undefined);
  });

  test('3.5: Massive 2MB note content parsing performance without regex ReDoS', () => {
    const largeBody = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(40000);
    const content = `---\ntitle: "Large Note"\npdf_url: "https://example.com/massive.pdf"\n---\n\n${largeBody}`;

    const start = Date.now();
    const parsed = extractFrontmatterPdfUrl(content);
    const duration = Date.now() - start;

    assert.strictEqual(parsed, 'https://example.com/massive.pdf');
    assert.ok(duration < 100, `Parsing 2MB content took ${duration}ms, expected < 100ms`);
  });

  test('3.6: URLs with query parameters, tokens, and URL-encoded characters', () => {
    const complexUrl = 'https://gbdwswfrscjccaaeciiu.supabase.co/storage/v1/object/public/media/vault_pdfs/user1/test%20file_2026.pdf?token=abc123xyz&v=2';
    const content = `---\ntitle: "Complex"\npdf_url: "${complexUrl}"\n---`;

    const parsed = extractFrontmatterPdfUrl(content);
    assert.strictEqual(parsed, complexUrl);
  });
});

// ============================================================================
// SUITE 4: Cache Injection & Synthetic Placeholder Eradication
// ============================================================================
describe('Suite 4: Cache Injection & Synthetic Placeholder Eradication', () => {

  test('4.1: isSyntheticItem identifies all 5 canonical synthetic items', () => {
    const canonicalSyntheticItems = [
      { title: 'Chapter 4: Optics & Quantum Waves' },
      { title: 'Photoelectric Effect Derivation & Notes' },
      { title: 'Modern Physics Complete Textbook' },
      { title: 'Wave Mechanics & de Broglie Wavelength' },
      { title: 'Tawjihi 2024 Physics Revision Guide' }
    ];

    for (const item of canonicalSyntheticItems) {
      assert.strictEqual(isSyntheticItem(item), true, `Item "${item.title}" must be identified as synthetic`);
    }
  });

  test('4.2: isSyntheticItem handles case variations, whitespace, and substrings', () => {
    const variations = [
      { title: 'CHAPTER 4: OPTICS & QUANTUM WAVES' },
      { title: '   photoelectric effect derivation   ' },
      { title: 'Notes on Modern Physics Complete Textbook and more' },
      { title: 'Study of Wave Mechanics & de Broglie Wavelength' },
      { title: 'TAWJIHI 2024 PHYSICS REVISION GUIDE - FINAL' }
    ];

    for (const item of variations) {
      assert.strictEqual(isSyntheticItem(item), true, `Variation "${item.title}" must be identified as synthetic`);
    }
  });

  test('4.3: isSyntheticItem NEVER produces false positives on authentic curriculum items', () => {
    const authenticItems = [
      { title: 'Deen' },
      { title: 'English' },
      { title: 'Deen 2.0' },
      { title: 'History' },
      { title: 'AI' },
      { title: 'Cloud Sync Verification Note' },
      { title: 'Physics Actual Student Notes' }, // genuine title without forbidden phrases
      { title: 'Quantum Computing Intro' },      // genuine AI note
      { title: 'General Optics Lab' }            // genuine optics lab note without quantum waves marker
    ];

    for (const item of authenticItems) {
      assert.strictEqual(isSyntheticItem(item), false, `Authentic item "${item.title}" must NOT be flagged as synthetic`);
    }
  });

  test('4.4: Cache sanitization simulation (sanitizeItems) eliminates 100% of poisoned items', () => {
    const poisonedCache = [
      { id: 'auth-1', title: 'Deen' },
      { id: 'fake-1', title: 'Chapter 4: Optics & Quantum Waves' },
      { id: 'auth-2', title: 'English' },
      { id: 'fake-2', title: 'Photoelectric Effect Derivation & Notes' },
      { id: 'auth-3', title: 'Deen 2.0' },
      { id: 'fake-3', title: 'Modern Physics Complete Textbook' },
      { id: 'auth-4', title: 'History' },
      { id: 'fake-4', title: 'Wave Mechanics & de Broglie Wavelength' },
      { id: 'auth-5', title: 'AI' },
      { id: 'fake-5', title: 'Tawjihi 2024 Physics Revision Guide' }
    ];

    const cleaned = sanitizeItems(poisonedCache);

    assert.strictEqual(cleaned.length, 5, `Expected 5 authentic items after sanitization, got ${cleaned.length}`);
    const remainingTitles = cleaned.map(i => i.title);
    assert.deepStrictEqual(remainingTitles, ['Deen', 'English', 'Deen 2.0', 'History', 'AI']);

    for (const item of cleaned) {
      assert.strictEqual(isSyntheticItem(item), false);
    }
  });

  test('4.5: Storage upload payload architecture (<50KB frontmatter, zero base64 DB bloat)', () => {
    const title = 'Sample Uploaded Book';
    const cdnUrl = 'https://gbdwswfrscjccaaeciiu.supabase.co/storage/v1/object/public/media/vault_pdfs/user/test.pdf';
    const extractedTextSample = 'Summary of page 1 text for search indexing.';

    const noteContent = `---\ntitle: "${title}"\ntype: "pdf"\npdf_url: "${cdnUrl}"\nfile_name: "test.pdf"\nuploaded_at: "${new Date().toISOString()}"\n---\n\n${extractedTextSample}`;

    const payloadSizeBytes = Buffer.byteLength(noteContent, 'utf-8');

    // Architecture requires storing CDN reference rather than multi-megabyte base64 string
    assert.ok(payloadSizeBytes < 50000, `Frontmatter note size (${payloadSizeBytes} bytes) must be well under 50KB`);
    assert.ok(!noteContent.includes('data:application/pdf;base64,'), 'Must not contain base64 PDF payload');
    assert.ok(noteContent.includes('pdf_url:'), 'Must contain lightweight CDN URL reference');
  });
});
