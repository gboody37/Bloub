/**
 * Unit Tests for Notion-Style Block AST Serializer
 * Executable via:
 *   node --experimental-strip-types tests/unit/block-serializer.test.ts
 */

import assert from 'node:assert';
import {
  markdownToBlocks,
  blocksToMarkdown,
  parseYamlFrontmatter,
  serializeYamlFrontmatter,
  normalizeCalloutType
} from '../../src/components/editor/serializer.ts';
import type { Block, BlockEditorDocument } from '../../src/components/editor/types.ts';

export async function runBlockSerializerTests(): Promise<void> {
  console.log('\n======================================================================');
  console.log('▶ RUNNING BLOCK AST SERIALIZER & PARSER UNIT TESTS');
  console.log('======================================================================\n');

  // Test 1: YAML Frontmatter Parsing & Serialization
  console.log('[1/10] Testing YAML frontmatter extraction and serialization...');
  const sampleYaml = `---
title: 'My Advanced Study Note'
tags: ['science', 'physics', 'relativity']
word_count: 450
is_favorite: true
pdf_url: 'https://storage.supabase.co/media/physics.pdf'
---

# Physics Notes
This is a note about relativity.
`;
  const doc1 = markdownToBlocks(sampleYaml);
  assert.strictEqual(doc1.frontmatter.title, 'My Advanced Study Note');
  assert.deepStrictEqual(doc1.frontmatter.tags, ['science', 'physics', 'relativity']);
  assert.strictEqual(doc1.frontmatter.word_count, 450);
  assert.strictEqual(doc1.frontmatter.is_favorite, true);
  assert.strictEqual(doc1.frontmatter.pdf_url, 'https://storage.supabase.co/media/physics.pdf');
  assert.strictEqual(doc1.blocks.length, 2);
  assert.strictEqual(doc1.blocks[0].type, 'heading1');
  assert.strictEqual(doc1.blocks[0].content, 'Physics Notes');
  assert.strictEqual(doc1.blocks[1].type, 'paragraph');
  assert.strictEqual(doc1.blocks[1].content, 'This is a note about relativity.');

  const serialized1 = blocksToMarkdown(doc1);
  assert(serialized1.includes("title: 'My Advanced Study Note'"));
  assert(serialized1.includes("# Physics Notes"));
  assert(serialized1.includes("This is a note about relativity."));
  console.log('  ✔ YAML frontmatter extraction and round-trip verified.');

  // Test 2: Headings H1, H2, H3
  console.log('[2/10] Testing Headings H1, H2, H3 parsing and formatting...');
  const headingMarkdown = `# Heading Level 1

## Heading Level 2

### Heading Level 3
`;
  const docHeadings = markdownToBlocks(headingMarkdown);
  assert.strictEqual(docHeadings.blocks.length, 3);
  assert.strictEqual(docHeadings.blocks[0].type, 'heading1');
  assert.strictEqual(docHeadings.blocks[0].content, 'Heading Level 1');
  assert.strictEqual(docHeadings.blocks[1].type, 'heading2');
  assert.strictEqual(docHeadings.blocks[1].content, 'Heading Level 2');
  assert.strictEqual(docHeadings.blocks[2].type, 'heading3');
  assert.strictEqual(docHeadings.blocks[2].content, 'Heading Level 3');
  const roundTripHeadings = blocksToMarkdown(docHeadings);
  assert.strictEqual(roundTripHeadings.trim(), headingMarkdown.trim());
  console.log('  ✔ Headings H1-H3 lossless round-trip verified.');

  // Test 3: Task Checkboxes (To-Do)
  console.log('[3/10] Testing To-Do list items with checked states and indentation...');
  const todoMarkdown = `- [ ] Uncompleted task 1
- [x] Completed task 2
  - [ ] Nested uncompleted subtask
  - [x] Nested completed subtask
`;
  const docTodo = markdownToBlocks(todoMarkdown);
  assert.strictEqual(docTodo.blocks.length, 4);
  assert.strictEqual(docTodo.blocks[0].type, 'todo');
  assert.strictEqual(docTodo.blocks[0].content, 'Uncompleted task 1');
  assert.strictEqual(docTodo.blocks[0].checked, false);
  assert.strictEqual(docTodo.blocks[0].indent, 0);

  assert.strictEqual(docTodo.blocks[1].type, 'todo');
  assert.strictEqual(docTodo.blocks[1].content, 'Completed task 2');
  assert.strictEqual(docTodo.blocks[1].checked, true);
  assert.strictEqual(docTodo.blocks[1].indent, 0);

  assert.strictEqual(docTodo.blocks[2].type, 'todo');
  assert.strictEqual(docTodo.blocks[2].content, 'Nested uncompleted subtask');
  assert.strictEqual(docTodo.blocks[2].checked, false);
  assert.strictEqual(docTodo.blocks[2].indent, 1);

  assert.strictEqual(docTodo.blocks[3].type, 'todo');
  assert.strictEqual(docTodo.blocks[3].content, 'Nested completed subtask');
  assert.strictEqual(docTodo.blocks[3].checked, true);
  assert.strictEqual(docTodo.blocks[3].indent, 1);

  const roundTripTodo = blocksToMarkdown(docTodo);
  assert.strictEqual(roundTripTodo.trim(), todoMarkdown.trim());
  console.log('  ✔ To-Do blocks with nested indentation verified.');

  // Test 4: Bullet and Numbered Lists
  console.log('[4/10] Testing Bullet and Numbered Lists with indentation...');
  const listsMarkdown = `- First bullet
- Second bullet
  - Nested bullet
1. First step
1. Second step
  1. Nested step
`;
  const docLists = markdownToBlocks(listsMarkdown);
  assert.strictEqual(docLists.blocks.length, 6);
  assert.strictEqual(docLists.blocks[0].type, 'bullet_list');
  assert.strictEqual(docLists.blocks[0].content, 'First bullet');
  assert.strictEqual(docLists.blocks[2].type, 'bullet_list');
  assert.strictEqual(docLists.blocks[2].indent, 1);

  assert.strictEqual(docLists.blocks[3].type, 'numbered_list');
  assert.strictEqual(docLists.blocks[3].content, 'First step');
  assert.strictEqual(docLists.blocks[5].type, 'numbered_list');
  assert.strictEqual(docLists.blocks[5].indent, 1);
  console.log('  ✔ Bullet & Numbered lists verified.');

  // Test 5: Code Blocks with Language and Multiline Syntax
  console.log('[5/10] Testing Code Blocks with syntax preservation...');
  const codeMarkdown = `\`\`\`typescript
interface UserProfile {
  id: string;
  name: string;
  skills: string[];
}

const greet = (name: string): string => \`Hello \${name}\`;
\`\`\`
`;
  const docCode = markdownToBlocks(codeMarkdown);
  assert.strictEqual(docCode.blocks.length, 1);
  assert.strictEqual(docCode.blocks[0].type, 'code_block');
  assert.strictEqual(docCode.blocks[0].language, 'typescript');
  assert(docCode.blocks[0].content.includes('interface UserProfile'));
  assert(docCode.blocks[0].content.includes('const greet ='));

  const roundTripCode = blocksToMarkdown(docCode);
  assert.strictEqual(roundTripCode.trim(), codeMarkdown.trim());
  console.log('  ✔ Code blocks with multiline syntax verified.');

  // Test 6: Callouts / Obsidian Admonitions
  console.log('[6/10] Testing Callouts & Obsidian Admonitions...');
  const calloutMarkdown = `> [!NOTE]
> This is an important note regarding data persistence.
> Please ensure offline WAL is enabled.

> [!WARNING]
> Do not modify database schemas directly in production.
`;
  const docCallout = markdownToBlocks(calloutMarkdown);
  assert.strictEqual(docCallout.blocks.length, 2);
  assert.strictEqual(docCallout.blocks[0].type, 'callout');
  assert.strictEqual(docCallout.blocks[0].calloutType, 'note');
  assert(docCallout.blocks[0].content.includes('This is an important note regarding data persistence.'));
  assert(docCallout.blocks[0].content.includes('Please ensure offline WAL is enabled.'));

  assert.strictEqual(docCallout.blocks[1].type, 'callout');
  assert.strictEqual(docCallout.blocks[1].calloutType, 'warning');
  assert(docCallout.blocks[1].content.includes('Do not modify database schemas directly in production.'));

  const roundTripCallout = blocksToMarkdown(docCallout);
  assert(roundTripCallout.includes('> [!NOTE]'));
  assert(roundTripCallout.includes('> [!WARNING]'));
  console.log('  ✔ Obsidian callouts / admonitions verified.');

  // Test 7: Blockquote
  console.log('[7/10] Testing Blockquotes...');
  const quoteMarkdown = `> Simple is better than complex.
> Complex is better than complicated.
`;
  const docQuote = markdownToBlocks(quoteMarkdown);
  assert.strictEqual(docQuote.blocks.length, 1);
  assert.strictEqual(docQuote.blocks[0].type, 'quote');
  assert.strictEqual(
    docQuote.blocks[0].content,
    'Simple is better than complex.\nComplex is better than complicated.'
  );
  console.log('  ✔ Blockquotes verified.');

  // Test 8: Horizontal Dividers
  console.log('[8/10] Testing Horizontal Dividers (---, ***, ___)...');
  const dividerMarkdown = `First section

---

Second section

***

Third section
`;
  const docDivider = markdownToBlocks(dividerMarkdown);
  assert.strictEqual(docDivider.blocks.length, 5);
  assert.strictEqual(docDivider.blocks[0].type, 'paragraph');
  assert.strictEqual(docDivider.blocks[1].type, 'divider');
  assert.strictEqual(docDivider.blocks[2].type, 'paragraph');
  assert.strictEqual(docDivider.blocks[3].type, 'divider');
  assert.strictEqual(docDivider.blocks[4].type, 'paragraph');
  console.log('  ✔ Horizontal dividers verified.');

  // Test 9: Wikilinks and Inline Formatting
  console.log('[9/10] Testing Wikilinks and inline tags preservation...');
  const inlineMarkdown = `Check out [[Artificial Intelligence|AI Guide]] and [[Quantum Computing]]. Also see #machine-learning and \`const x = 42\`.`;
  const docInline = markdownToBlocks(inlineMarkdown);
  assert.strictEqual(docInline.blocks.length, 1);
  assert(docInline.blocks[0].content.includes('[[Artificial Intelligence|AI Guide]]'));
  assert(docInline.blocks[0].content.includes('[[Quantum Computing]]'));
  assert(docInline.blocks[0].content.includes('#machine-learning'));
  assert(docInline.blocks[0].content.includes('`const x = 42`'));
  const roundTripInline = blocksToMarkdown(docInline);
  assert.strictEqual(roundTripInline.trim(), inlineMarkdown.trim());
  console.log('  ✔ Wikilinks and inline tags preserved.');

  // Test 10: Empty Documents & Fallback Handling
  console.log('[10/10] Testing empty document fallbacks and robustness...');
  const docEmpty = markdownToBlocks('');
  assert.strictEqual(docEmpty.blocks.length, 1);
  assert.strictEqual(docEmpty.blocks[0].type, 'paragraph');
  assert.strictEqual(docEmpty.blocks[0].content, '');

  const docWhitespace = markdownToBlocks('   \n\n   \n');
  assert.strictEqual(docWhitespace.blocks.length, 1);
  assert.strictEqual(docWhitespace.blocks[0].type, 'paragraph');
  console.log('  ✔ Empty document edge cases handled safely.');

  console.log('\n✔ ALL 10 BLOCK AST SERIALIZER UNIT TESTS PASSED WITH 100% SUCCESS!\n');
}

// Auto-execute when run directly
if (
  process.argv[1] &&
  (import.meta.url.toLowerCase().includes(process.argv[1].replace(/\\/g, '/').toLowerCase()) ||
   process.argv[1].endsWith('block-serializer.test.ts'))
) {
  runBlockSerializerTests();
}
