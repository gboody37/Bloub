/**
 * Tier 1, 2, 3 Integration Test Suite: PDF Note & Annotation Persistence Pipeline
 * Feature Covered: F10 (Note Persistence & Auto-Save)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseObsidianMarkdown, updateFrontmatterField } from '../../src/lib/obsidian/parser.ts';

export interface PageNotes {
  text: string;
  lang: 'en' | 'ar';
}

export interface PdfAnnotationPayload {
  notes: Record<number, PageNotes>;
  annotations: Record<number, any[]>;
}

export class MockPersistenceManager {
  currentNoteContent: string;
  isDirty = false;
  saveCallCount = 0;
  savedPayloads: PdfAnnotationPayload[] = [];
  debounceTimer: NodeJS.Timeout | null = null;

  constructor(initialContent = '') {
    this.currentNoteContent = initialContent;
  }

  serializePayload(notes: Record<number, PageNotes>, annotations: Record<number, any[]>): string {
    const payload: PdfAnnotationPayload = { notes, annotations };
    return JSON.stringify(payload);
  }

  deserializePayload(content: string): PdfAnnotationPayload {
    const parsed = parseObsidianMarkdown(content, 'test-note.md');
    const rawPdfNotes = parsed.frontmatter.pdf_notes;
    if (!rawPdfNotes || typeof rawPdfNotes !== 'string') {
      return { notes: {}, annotations: {} };
    }
    try {
      return JSON.parse(rawPdfNotes);
    } catch {
      return { notes: {}, annotations: {} };
    }
  }

  triggerDebouncedSave(notes: Record<number, PageNotes>, annotations: Record<number, any[]>, delay = 1500): Promise<void> {
    this.isDirty = true;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    return new Promise((resolve) => {
      this.debounceTimer = setTimeout(() => {
        this.flushImmediate(notes, annotations);
        resolve();
      }, delay);
    });
  }

  flushImmediate(notes: Record<number, PageNotes>, annotations: Record<number, any[]>, pendingText?: any): void {
    if (!this.isDirty && !pendingText) return;

    // Commit in-flight pending text if supplied
    const finalAnnotations = { ...annotations };
    if (pendingText && pendingText.text && pendingText.text.trim()) {
      const page = 1;
      const pageAnns = finalAnnotations[page] || [];
      finalAnnotations[page] = [
        ...pageAnns,
        {
          id: pendingText.id || Date.now(),
          type: 'text',
          x: pendingText.x,
          y: pendingText.y,
          text: pendingText.text.trim(),
          color: pendingText.color || '#9333ea',
          fontSize: pendingText.fontSize || 16,
        }
      ];
    }

    const json = this.serializePayload(notes, finalAnnotations);
    this.currentNoteContent = updateFrontmatterField(this.currentNoteContent, 'pdf_notes', json);
    this.savedPayloads.push({ notes, annotations: finalAnnotations });
    this.saveCallCount++;
    this.isDirty = false;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

describe('Tier 1: Feature Coverage — Persistence Pipeline (F10)', () => {
  it('T1.10.1: should serialize and deserialize notes & annotations to YAML frontmatter under pdf_notes', () => {
    const manager = new MockPersistenceManager('---\ntitle: Study Guide\n---\n\n# Document Notes');
    const notes: Record<number, PageNotes> = {
      1: { text: 'ملاحظة مهمة على الصفحة الأولى', lang: 'ar' },
    };
    const annotations: Record<number, any[]> = {
      1: [{ id: 101, type: 'highlight', startX: 50, startY: 100, w: 200, h: 20, color: '#fef08a' }],
    };

    manager.isDirty = true;
    manager.flushImmediate(notes, annotations);

    const reloaded = manager.deserializePayload(manager.currentNoteContent);
    assert.deepEqual(reloaded.notes[1], { text: 'ملاحظة مهمة على الصفحة الأولى', lang: 'ar' });
    assert.equal(reloaded.annotations[1].length, 1);
    assert.equal(reloaded.annotations[1][0].id, 101);
  });

  it('T1.10.2: should preserve existing frontmatter fields (title, tags, aliases) when updating pdf_notes', () => {
    const raw = '---\ntitle: Anatomy Chapter 1\ntags:\n  - medical\n  - biology\n---\nBody text';
    const manager = new MockPersistenceManager(raw);

    manager.isDirty = true;
    manager.flushImmediate({ 1: { text: 'Chapter 1 notes', lang: 'en' } }, { 1: [] });

    const parsed = parseObsidianMarkdown(manager.currentNoteContent, 'anatomy.md');
    assert.equal(parsed.frontmatter.title, 'Anatomy Chapter 1');
    assert.ok(parsed.tags.includes('medical'));
    assert.ok(parsed.tags.includes('biology'));
  });

  it('T1.10.3: should debounce rapid mutations and execute single save after 1500ms delay', async () => {
    const manager = new MockPersistenceManager();
    const notes = { 1: { text: 'Draft 1', lang: 'en' as const } };
    const annotations = { 1: [{ id: 1, type: 'highlight', startX: 10, startY: 10, w: 100, h: 20, color: '#fef08a' }] };

    // Trigger 5 rapid mutations with 10ms debounce simulation
    manager.triggerDebouncedSave(notes, annotations, 20);
    manager.triggerDebouncedSave(notes, annotations, 20);
    manager.triggerDebouncedSave(notes, annotations, 20);
    manager.triggerDebouncedSave(notes, annotations, 20);
    await manager.triggerDebouncedSave(notes, annotations, 20);

    assert.equal(manager.saveCallCount, 1);
    assert.equal(manager.isDirty, false);
  });

  it('T1.10.4: should commit in-flight pending text note immediately when flush is triggered before blur', () => {
    const manager = new MockPersistenceManager();
    const pending = { x: 120, y: 340, text: 'ملاحظة غير مكتملة بعد', color: '#3b82f6', fontSize: 18 };

    manager.flushImmediate({}, {}, pending);

    const reloaded = manager.deserializePayload(manager.currentNoteContent);
    assert.equal(reloaded.annotations[1].length, 1);
    assert.equal(reloaded.annotations[1][0].text, 'ملاحظة غير مكتملة بعد');
    assert.equal(reloaded.annotations[1][0].fontSize, 18);
  });

  it('T1.10.5: should flush dirty state immediately on component unmount or note transition', () => {
    const manager = new MockPersistenceManager();
    manager.isDirty = true;
    const notes = { 1: { text: 'Unsaved note before switch', lang: 'ar' as const } };

    // Simulate note switch flush
    manager.flushImmediate(notes, {});
    assert.equal(manager.saveCallCount, 1);
    assert.equal(manager.isDirty, false);
  });
});

describe('Tier 2: Boundary & Corner Cases — Persistence', () => {
  it('T2.1: should safely escape single quotes in text annotations and Arabic notes', () => {
    const manager = new MockPersistenceManager();
    const notes: Record<number, PageNotes> = {
      1: { text: "Student's note: 'ملاحظة' with single quotes and 'nested' quotes", lang: 'en' },
    };
    const annotations: Record<number, any[]> = {
      1: [{ id: 1, type: 'text', x: 50, y: 50, text: "It's a test: 'Quote'", color: '#000', fontSize: 14 }],
    };

    manager.isDirty = true;
    manager.flushImmediate(notes, annotations);

    const reloaded = manager.deserializePayload(manager.currentNoteContent);
    assert.equal(reloaded.notes[1].text, "Student's note: 'ملاحظة' with single quotes and 'nested' quotes");
    assert.equal(reloaded.annotations[1][0].text, "It's a test: 'Quote'");
  });

  it('T2.2: should safely handle special characters (colons, hashtags, backslashes, emojis, newlines)', () => {
    const manager = new MockPersistenceManager();
    const notes: Record<number, PageNotes> = {
      1: { text: 'Heading: Subheading #tag\nLine 2 with emojis: 🧀📚💡 and backslashes \\n \\t', lang: 'ar' },
    };

    manager.isDirty = true;
    manager.flushImmediate(notes, {});

    const reloaded = manager.deserializePayload(manager.currentNoteContent);
    assert.ok(reloaded.notes[1].text.includes('🧀📚💡'));
    assert.ok(reloaded.notes[1].text.includes('Heading: Subheading'));
  });

  it('T2.3: should recover gracefully from malformed or corrupted YAML frontmatter without crashing', () => {
    const corruptContent = '---\npdf_notes: "{ invalid json ::: 123 }"\n---\nBody';
    const manager = new MockPersistenceManager(corruptContent);

    const reloaded = manager.deserializePayload(manager.currentNoteContent);
    assert.deepEqual(reloaded, { notes: {}, annotations: {} });
  });

  it('T2.4: should ignore whitespace-only pending text notes during flush', () => {
    const manager = new MockPersistenceManager();
    const whitespacePending = { x: 10, y: 10, text: '    \t\n   ' };

    manager.flushImmediate({}, {}, whitespacePending);

    const reloaded = manager.deserializePayload(manager.currentNoteContent);
    assert.deepEqual(reloaded.annotations, {});
  });

  it('T2.5: should isolate annotations across multiple document pages (Page 1 vs Page 2 vs Page 10)', () => {
    const manager = new MockPersistenceManager();
    const annotations: Record<number, any[]> = {
      1: [{ id: 1, type: 'highlight', startX: 10, startY: 10, w: 100, h: 20, color: '#fef08a' }],
      2: [{ id: 2, type: 'highlight', startX: 20, startY: 20, w: 150, h: 20, color: '#bbf7d0' }],
      10: [{ id: 3, type: 'text', x: 50, y: 50, text: 'خاتمة البحث', color: '#ef4444', fontSize: 16 }],
    };

    manager.isDirty = true;
    manager.flushImmediate({}, annotations);

    const reloaded = manager.deserializePayload(manager.currentNoteContent);
    assert.equal(reloaded.annotations[1].length, 1);
    assert.equal(reloaded.annotations[2].length, 1);
    assert.equal(reloaded.annotations[10].length, 1);
    assert.equal(reloaded.annotations[10][0].text, 'خاتمة البحث');
  });
});

describe('Tier 3: Cross-Feature Interactions (Multi-Trigger Flush + Reload Roundtrip)', () => {
  it('T3.1: should handle rapid note switching: flush Note A dirty state before loading Note B', () => {
    const noteA = new MockPersistenceManager('---\ntitle: Note A\n---\nNote A content');
    const noteB = new MockPersistenceManager('---\ntitle: Note B\n---\nNote B content');

    // User annotates Note A
    noteA.isDirty = true;
    const noteAAnns = { 1: [{ id: 10, type: 'highlight', startX: 50, startY: 50, w: 100, h: 15, color: '#fef08a' }] };

    // Note switch event occurs: flush Note A
    noteA.flushImmediate({}, noteAAnns);

    // Note B loads
    const noteBPayload = noteB.deserializePayload(noteB.currentNoteContent);
    assert.deepEqual(noteBPayload, { notes: {}, annotations: {} });

    // Verify Note A has persisted correctly
    const noteAPayload = noteA.deserializePayload(noteA.currentNoteContent);
    assert.equal(noteAPayload.annotations[1].length, 1);
    assert.equal(noteAPayload.annotations[1][0].id, 10);
  });
});
