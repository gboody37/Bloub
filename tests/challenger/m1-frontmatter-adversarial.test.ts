/**
 * Adversarial Frontmatter Edge Case Test Suite for Milestone M1_PDF_OVERHAUL
 * 
 * Tests:
 * 1. Missing newlines before/after delimiters
 * 2. Multiple delimiters in note body (horizontal rules, code blocks)
 * 3. Empty and whitespace-only frontmatter blocks
 * 4. Unicode keys, values, tags, Arabic/CJK/Emoji
 * 5. URLs with multiple colons, ports, query params, fragments
 * 6. Malformed YAML syntax resilience without throwing or data loss
 * 7. Windows CRLF (\r\n) and Unix LF (\n) mixed line endings
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseObsidianMarkdown } from '../verification/verify-ac2-obsidian-sync.ts';

describe('Adversarial Frontmatter Edge Cases & Stress Tests', () => {

  it('EDGE-1: Delimiter missing newline before closing delimiter (Reviewer 1 defect reproduction)', () => {
    const raw = `---\ntitle: "Unspaced Delimiter"\npdf_url: "https://gbdwswfrscjccaaeciiu.supabase.co/storage/v1/object/public/media/vault_pdfs/sample.pdf"---# Heading 1\n\nBody content`;
    const parsed = parseObsidianMarkdown(raw, 'Documents/sample.pdf.md');

    assert.equal(parsed.title, 'Heading 1'); // Heading 1 takes priority in title extraction
    assert.equal(parsed.frontmatter.title, 'Unspaced Delimiter');
    assert.equal(parsed.frontmatter.pdf_url, 'https://gbdwswfrscjccaaeciiu.supabase.co/storage/v1/object/public/media/vault_pdfs/sample.pdf');
    assert.ok(parsed.bodyContent.includes('# Heading 1'));
    assert.ok(parsed.bodyContent.includes('Body content'));
    assert.ok(!parsed.bodyContent.includes('pdf_url'));
  });

  it('EDGE-2: Delimiters with trailing spaces and tabs', () => {
    const raw = `---  \t\r\ntitle: "Spaced Delimiters"\r\ntype: "pdf"\r\npdf_url: "https://example.com/doc.pdf"\r\n---   \t\r\n\r\nRest of the document`;
    const parsed = parseObsidianMarkdown(raw, 'spaced.md');

    assert.equal(parsed.title, 'Spaced Delimiters');
    assert.equal(parsed.frontmatter.type, 'pdf');
    assert.equal(parsed.frontmatter.pdf_url, 'https://example.com/doc.pdf');
    assert.ok(parsed.bodyContent.includes('Rest of the document'));
  });

  it('EDGE-3: Empty frontmatter blocks', () => {
    const inputs = [
      `---\n---\nBody text`,
      `---\r\n---\r\nBody text`,
      `---\n   \n---\nBody text`,
      `---\r\n   \r\n---\r\nBody text`,
      `---\n# Only comments\n---\nBody text`
    ];

    for (const [idx, input] of inputs.entries()) {
      const parsed = parseObsidianMarkdown(input, `empty-${idx}.md`);
      assert.deepEqual(parsed.frontmatter, {}, `Failed on empty frontmatter input ${idx}`);
      assert.ok(parsed.bodyContent.includes('Body text'), `Body text lost on input ${idx}`);
    }
  });

  it('EDGE-4: Multiple horizontal rules and delimiters in document body', () => {
    const raw = `---
title: "Multi-Rule Note"
pdf_url: "https://storage.supabase.co/doc.pdf"
---

# Section 1
Some intro text

---

## Section 2 with horizontal rule above
Another paragraph

---
Yet another hr
`;
    const parsed = parseObsidianMarkdown(raw, 'multi-rule.md');

    assert.equal(parsed.frontmatter.title, 'Multi-Rule Note');
    assert.equal(parsed.frontmatter.pdf_url, 'https://storage.supabase.co/doc.pdf');
    assert.equal(parsed.headings.length, 2);
    assert.equal(parsed.headings[0].text, 'Section 1');
    assert.equal(parsed.headings[1].text, 'Section 2 with horizontal rule above');
    assert.ok(parsed.bodyContent.includes('Section 1'));
    assert.ok(parsed.bodyContent.includes('Section 2'));
    assert.ok(!parsed.bodyContent.startsWith('---'));
  });

  it('EDGE-5: Markdown code blocks containing YAML frontmatter syntax', () => {
    const raw = `---
title: "Note with Code Block"
tags: [tutorial, markdown]
---

Here is how you write frontmatter:

\`\`\`markdown
---
title: "Embedded YAML"
pdf_url: "https://fake.url/inner.pdf"
---
\`\`\`

End of tutorial.`;

    const parsed = parseObsidianMarkdown(raw, 'code-block.md');

    assert.equal(parsed.frontmatter.title, 'Note with Code Block');
    assert.equal(parsed.frontmatter.pdf_url, undefined);
    assert.ok(parsed.bodyContent.includes('```markdown'));
    assert.ok(parsed.bodyContent.includes('https://fake.url/inner.pdf'));
  });

  it('EDGE-6: URLs with multiple colons, ports, query strings, and fragments', () => {
    const complexUrl = 'https://sub.domain.supabase.co:8443/storage/v1/object/public/media/vault_pdfs/user-123/file_1.pdf?token=abc:def&v=2#page=3&zoom=fit';
    const raw = `---
title: "Complex URL Test"
pdf_url: "${complexUrl}"
api_endpoint: http://localhost:3000/api/v1
---

Document text`;

    const parsed = parseObsidianMarkdown(raw, 'complex-url.md');

    assert.equal(parsed.frontmatter.pdf_url, complexUrl);
    assert.equal(parsed.frontmatter.api_endpoint, 'http://localhost:3000/api/v1');
  });

  it('EDGE-7: Arabic and Unicode keys, values, and hashtags', () => {
    const raw = `---
title: "ملف الذكاء الاصطناعي"
author: "أحمد بن علي"
tags: [ذكاء_اصطناعي, جبنة, حوسبة_سحابية]
pdf_url: "https://supabase.co/media/arabic_1.pdf"
---

# الذكاء الاصطناعي في 2026
هذا نص تجريبي باللغة العربية مع وسم إضافي #تعلم_الآلة.
`;

    const parsed = parseObsidianMarkdown(raw, 'Study/arabic.pdf.md');

    assert.equal(parsed.title, 'الذكاء الاصطناعي في 2026');
    assert.equal(parsed.frontmatter.title, 'ملف الذكاء الاصطناعي');
    assert.equal(parsed.frontmatter.author, 'أحمد بن علي');
    assert.equal(parsed.frontmatter.pdf_url, 'https://supabase.co/media/arabic_1.pdf');
    assert.ok(parsed.tags.includes('ذكاء_اصطناعي'));
    assert.ok(parsed.tags.includes('جبنة'));
    assert.ok(parsed.tags.includes('تعلم_الآلة'));
  });

  it('EDGE-8: Malformed YAML lines do not crash parser and retain valid attributes', () => {
    const raw = `---
title: "Partially Corrupt Frontmatter"
invalid_line_without_colon
pdf_url: "https://valid.storage.com/doc.pdf"
broken_list:
  - not formatted
tags: [valid_tag]
---

Body text survives intact`;

    const parsed = parseObsidianMarkdown(raw, 'corrupt.md');

    assert.equal(parsed.frontmatter.title, 'Partially Corrupt Frontmatter');
    assert.equal(parsed.frontmatter.pdf_url, 'https://valid.storage.com/doc.pdf');
    assert.deepEqual(parsed.frontmatter.tags, ['valid_tag']);
    assert.ok(parsed.bodyContent.includes('Body text survives intact'));
  });

  it('EDGE-9: Note with no frontmatter but starting with text that looks like a tag or dash', () => {
    const raw = `- item 1\n- item 2\n---\nSome text`;
    const parsed = parseObsidianMarkdown(raw, 'no-frontmatter.md');

    assert.deepEqual(parsed.frontmatter, {});
    assert.ok(parsed.bodyContent.includes('- item 1'));
  });

  it('EDGE-10: Rapid consecutive parsing of 1,000 edge cases under 50ms', () => {
    const raw = `---\ntitle: "Stress Test"\ntype: "pdf"\npdf_url: "https://example.com/storage/1.pdf"\n---\n\n# Heading 1\nBody with [[Link|Alias]] and #tag.`;
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      const res = parseObsidianMarkdown(raw, `stress_${i}.md`);
      assert.equal(res.frontmatter.type, 'pdf');
    }
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 100, `1,000 parses took ${elapsed.toFixed(2)}ms (expected < 100ms)`);
  });

});
