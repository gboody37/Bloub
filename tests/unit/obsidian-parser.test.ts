/**
 * Tier 1 & Tier 2 Unit Tests: Obsidian Markdown & YAML Frontmatter Parser
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseObsidianMarkdown } from '../verification/verify-ac2-obsidian-sync.ts';
import { 
  sampleValidNote, 
  malformedYamlNote, 
  emptyNote, 
  whitespaceNote, 
  unicodeNote, 
  brokenLinksNote, 
  dataviewCalloutsNote,
  generateMassiveNote 
} from '../fixtures/sample-notes.ts';

describe('Obsidian Parser Feature Coverage (Tier 1)', () => {
  it('T1.1: should extract structured YAML frontmatter (tags, status, aliases, dates)', () => {
    const note = parseObsidianMarkdown(sampleValidNote, '02 - Core Brain/Antigravity Agent Architecture.md');
    
    assert.equal(note.title, 'Antigravity Agent Architecture');
    assert.equal(note.frontmatter.status, 'Complete');
    assert.equal(note.frontmatter.created, '2026-08-10');
    assert.deepEqual(note.frontmatter.aliases, ['Antigravity', 'AGY Architecture']);
    assert.ok(note.tags.includes('concept'));
    assert.ok(note.tags.includes('brain'));
    assert.ok(note.tags.includes('agent'));
  });

  it('T1.2: should extract wikilinks with targets and display aliases', () => {
    const note = parseObsidianMarkdown(sampleValidNote, '02 - Core Brain/Antigravity Agent Architecture.md');
    
    assert.ok(note.wikilinks.length >= 3);
    const mcpLink = note.wikilinks.find(l => l.target.includes('Model Context Protocol'));
    assert.ok(mcpLink);
    assert.equal(mcpLink?.alias, 'Model Context Protocol (MCP) Guide');

    const agentRulesLink = note.wikilinks.find(l => l.target.includes('Agent Skills & Rules'));
    assert.ok(agentRulesLink);
    assert.equal(agentRulesLink?.alias, 'Agent Skills Registry');
  });

  it('T1.3: should extract outline headings with accurate nesting levels and slugs', () => {
    const note = parseObsidianMarkdown(sampleValidNote, '02 - Core Brain/Antigravity Agent Architecture.md');
    
    assert.ok(note.headings.length >= 4);
    assert.equal(note.headings[0].level, 1);
    assert.ok(note.headings[0].text.includes('Antigravity Agent Architecture'));

    const h2s = note.headings.filter(h => h.level === 2);
    assert.ok(h2s.length >= 3);
    assert.ok(h2s.some(h => h.text.includes('Architecture Components')));
    assert.ok(h2s.some(h => h.text.includes('Key Capabilities')));

    const h3s = note.headings.filter(h => h.level === 3);
    assert.ok(h3s.some(h => h.text.includes('Progressive Disclosure')));
  });

  it('T1.4: should calculate accurate word count on stripped body content', () => {
    const note = parseObsidianMarkdown(sampleValidNote, '02 - Core Brain/Antigravity Agent Architecture.md');
    assert.ok(note.wordCount > 50);
    assert.ok(!note.bodyContent.startsWith('---'), 'YAML header must be stripped from body');
  });

  it('T1.5: should extract inline hashtags from markdown body', () => {
    const inlineContent = `# Note With Inline Tags\nLearning about #react and #testing in 2026.`;
    const note = parseObsidianMarkdown(inlineContent, 'test.md');
    assert.ok(note.tags.includes('react'));
    assert.ok(note.tags.includes('testing'));
  });
});

describe('Obsidian Parser Boundary & Edge Cases (Tier 2)', () => {
  it('T2.1: should gracefully handle malformed YAML frontmatter without crashing', () => {
    const note = parseObsidianMarkdown(malformedYamlNote, 'malformed.md');
    assert.ok(note);
    assert.equal(note.title, 'Malformed YAML Note');
    assert.ok(note.bodyContent.includes('useful markdown text'));
  });

  it('T2.2: should handle empty note (0 bytes)', () => {
    const note = parseObsidianMarkdown(emptyNote, 'empty.md');
    assert.equal(note.wordCount, 0);
    assert.equal(note.headings.length, 0);
    assert.equal(note.wikilinks.length, 0);
    assert.equal(note.title, 'empty');
  });

  it('T2.3: should handle whitespace-only note', () => {
    const note = parseObsidianMarkdown(whitespaceNote, 'whitespace.md');
    assert.equal(note.wordCount, 0);
    assert.equal(note.title, 'whitespace');
  });

  it('T2.4: should preserve callout blocks and dataview code blocks intact in body', () => {
    const note = parseObsidianMarkdown(dataviewCalloutsNote, 'dataview.md');
    assert.ok(note.bodyContent.includes('> [!NOTE] Key Takeaway'));
    assert.ok(note.bodyContent.includes('```dataview'));
    assert.ok(note.tags.includes('dataview'));
  });

  it('T2.5: should parse Arabic & Unicode notes with full fidelity', () => {
    const note = parseObsidianMarkdown(unicodeNote, 'arabic-note.md');
    assert.ok(note.tags.includes('جبنة'));
    assert.ok(note.tags.includes('تعلم'));
    assert.ok(note.title.includes('تطبيق جبنة'));
    assert.ok(note.bodyContent.includes('اللغة العربية'));
  });

  it('T2.6: should extract links to non-existent or ghost notes safely', () => {
    const note = parseObsidianMarkdown(brokenLinksNote, 'broken.md');
    assert.equal(note.wikilinks.length, 2);
    assert.equal(note.wikilinks[0].target, 'NonExistentConceptNode');
    assert.equal(note.wikilinks[1].target, 'MissingFolder/AnotherGhostNote');
    assert.equal(note.wikilinks[1].alias, 'Ghost Link');
  });

  it('T2.7: should parse massive 26,000+ word notes within performance budget (< 100ms)', () => {
    const massive = generateMassiveNote(26000);
    const start = performance.now();
    const note = parseObsidianMarkdown(massive, 'massive.md');
    const elapsed = performance.now() - start;

    assert.ok(note.wordCount > 25000);
    assert.ok(elapsed < 100, `Massive note parsing took ${elapsed.toFixed(2)}ms, expected < 100ms`);
  });
});
