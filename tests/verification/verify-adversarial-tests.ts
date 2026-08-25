import { parseObsidianMarkdown, updateFrontmatterField } from '../../src/lib/obsidian/parser.ts';

export async function verifyAdversarial(): Promise<boolean> {
  let failureCount = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✔ PASS: ${name}`);
    } catch (e: any) {
      failureCount++;
      console.error(`  ✖ FAIL: ${name} -> ${e.message}`);
    }
  }

  console.log('[1/7] Testing preservation of existing frontmatter keys & HR delimiters...');
  test('Preserve other frontmatter and body with HR', () => {
    const doc = '---\ntitle: Machine Learning\ntags: [ai, study]\nstatus: done\n---\n\n# Introduction\nSome text\n\n---\n\nMore text';
    const updated = updateFrontmatterField(doc, 'pdf_notes', JSON.stringify({ notes: { 1: { text: 'Note 1' } } }));
    const parsed = parseObsidianMarkdown(updated, 'test.md');
    if (parsed.frontmatter.title !== 'Machine Learning') throw new Error('title corrupted');
    if (!parsed.tags.includes('ai') || !parsed.tags.includes('study')) throw new Error('tags corrupted');
    if (parsed.frontmatter.status !== 'done') throw new Error('status corrupted');
    if (!parsed.frontmatter.pdf_notes) throw new Error('pdf_notes missing');
    const parsedNotes = JSON.parse(parsed.frontmatter.pdf_notes);
    if (parsedNotes.notes[1].text !== 'Note 1') throw new Error('notes content corrupted');
    if (!parsed.bodyContent.includes('More text')) throw new Error('body content lost');
  });

  console.log('[2/7] Testing multiple sequential updates idempotence...');
  test('Multiple sequential updates do not duplicate or corrupt', () => {
    let doc = '---\ntitle: Iterative Note\n---\n\n# Body';
    for (let i = 1; i <= 10; i++) {
      doc = updateFrontmatterField(doc, 'pdf_notes', JSON.stringify({ step: i, text: `It's step ${i}` }));
    }
    const parsed = parseObsidianMarkdown(doc, 'test.md');
    const parsedNotes = JSON.parse(parsed.frontmatter.pdf_notes);
    if (parsedNotes.step !== 10) throw new Error(`step mismatch: ${parsedNotes.step}`);
    if (parsedNotes.text !== "It's step 10") throw new Error(`text mismatch: ${parsedNotes.text}`);
    const count = (doc.match(/pdf_notes:/g) || []).length;
    if (count !== 1) throw new Error(`pdf_notes duplicated ${count} times`);
  });

  console.log('[3/7] Testing special characters, quotes, colons, Arabic & Unicode...');
  test('Special characters in annotations and notes', () => {
    const complexData = {
      notes: {
        1: { text: "He said: \"It's 'crucial' to know [[Neural Networks]]!\" -- مرحبا بالعالم 🚀", lang: 'ar' }
      },
      annotations: {
        1: [
          { id: 1, type: 'highlight', startX: 10.5, startY: 20.3, w: 100.2, h: 15.1 },
          { id: 2, type: 'text', x: 50, y: 80, text: "Key takeaway: 'Important' & \"Essential\" :)", color: '#9333ea' }
        ]
      }
    };
    const doc = '---\ntitle: Arabic & Special Chars\n---\n\n# Body';
    const updated = updateFrontmatterField(doc, 'pdf_notes', JSON.stringify(complexData));
    const parsed = parseObsidianMarkdown(updated, 'test.md');
    const parsedNotes = JSON.parse(parsed.frontmatter.pdf_notes);
    if (JSON.stringify(parsedNotes) !== JSON.stringify(complexData)) {
      throw new Error(`Data mismatch! Got: ${JSON.stringify(parsedNotes)}`);
    }
  });

  console.log('[4/7] Testing Windows CRLF line endings...');
  test('Windows CRLF line endings', () => {
    const doc = '---\r\ntitle: Windows CRLF\r\ntags: [test]\r\n---\r\n\r\n# CRLF Body\r\nHello\r\n';
    const updated = updateFrontmatterField(doc, 'pdf_notes', JSON.stringify({ ok: true }));
    const parsed = parseObsidianMarkdown(updated, 'crlf.md');
    if (parsed.frontmatter.title !== 'Windows CRLF') throw new Error('title corrupted on CRLF');
    const parsedNotes = JSON.parse(parsed.frontmatter.pdf_notes);
    if (!parsedNotes.ok) throw new Error('notes corrupted on CRLF');
  });

  console.log('[5/7] Testing document with no initial frontmatter...');
  test('Document with no initial frontmatter', () => {
    const doc = '# Raw Markdown\nThis note has no YAML frontmatter initially.';
    const updated = updateFrontmatterField(doc, 'pdf_notes', JSON.stringify({ initialized: true }));
    const parsed = parseObsidianMarkdown(updated, 'no-yaml.md');
    if (!parsed.frontmatter.pdf_notes) throw new Error('pdf_notes missing');
    if (parsed.title !== 'Raw Markdown') throw new Error('title parsing failed');
    if (!parsed.bodyContent.includes('This note has no YAML frontmatter initially.')) throw new Error('body missing');
  });

  console.log('[6/7] Testing multiline & escaped newlines inside annotations...');
  test('Multiline and escaped newlines inside annotations', () => {
    const data = {
      notes: {
        1: { text: "Paragraph 1\n\nParagraph 2 with 'quotes' and: colons\nLine 3", lang: "en" }
      },
      annotations: {
        1: [{ id: 101, type: "text", text: "Multi\nLine\nText", x: 10, y: 20 }]
      }
    };
    const doc = '---\ntitle: Multiline Note\n---\n\n# Body';
    const updated = updateFrontmatterField(doc, 'pdf_notes', JSON.stringify(data));
    const parsed = parseObsidianMarkdown(updated, 'multiline.md');
    const parsedNotes = JSON.parse(parsed.frontmatter.pdf_notes);
    if (parsedNotes.notes[1].text !== data.notes[1].text) {
      throw new Error('Multiline text mismatch in notes');
    }
    if (parsedNotes.annotations[1][0].text !== data.annotations[1][0].text) {
      throw new Error('Multiline text mismatch in annotations');
    }
  });

  console.log('[7/7] Testing empty frontmatter delimiters...');
  test('Empty frontmatter delimiters (--- \\n ---)', () => {
    const doc = '---\n---\n# Empty Frontmatter Body';
    const updated = updateFrontmatterField(doc, 'pdf_notes', JSON.stringify({ emptyFrontmatterTest: true }));
    const parsed = parseObsidianMarkdown(updated, 'empty-fm.md');
    const parsedNotes = JSON.parse(parsed.frontmatter.pdf_notes);
    if (!parsedNotes.emptyFrontmatterTest) throw new Error('Failed with empty frontmatter delimiters');
    if (!parsed.bodyContent.includes('# Empty Frontmatter Body')) throw new Error('body lost');
  });

  if (failureCount > 0) {
    throw new Error(`${failureCount} adversarial test cases failed.`);
  }

  console.log('\n✔ ADVERSARIAL VERIFICATION PASSED: All 7 parser and serializer stress scenarios verified.');
  return true;
}

// Run directly if invoked
if (process.argv[1]?.includes('verify-adversarial-tests')) {
  verifyAdversarial().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
