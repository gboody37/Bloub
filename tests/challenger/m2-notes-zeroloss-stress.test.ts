/**
 * Challenger M2-2 Empirical Stress Test Harness:
 * Per-Page Note Binding, Zero Data Loss, Offline WAL Network Resilience, & BiDi Typography
 * 
 * Objectives:
 * 1. Rapid Page Switching Stress: Simulate rapid typing into NotesPanel on Page 1, immediately jumping
 *    to Page 5 (well before the 500ms debounce), typing on Page 5, and jumping back to Page 1.
 *    Verify 100% data preservation on Page 1 and Page 5 with zero cross-contamination.
 * 2. Network Interruption & Auto-Flush on Page Flip: Simulate page navigation while Supabase requests fail.
 *    Verify mutations are buffered into Offline WAL with synced: false and replayed cleanly on reconnect.
 * 3. Language Switcher & Handwriting Fonts: Verify language toggle between English (font-caveat, LTR)
 *    and Arabic (font-lemonada, RTL) persists per page without corrupting text or direction.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { 
  recordMutation, 
  getPendingMutations, 
  markMutationSynced, 
  markMutationFailed, 
  flushPendingMutations, 
  clearSyncedMutations, 
  resetWALStore,
  type MutationRecord
} from '../../src/lib/storage/offline-wal.ts';
import { 
  updateFrontmatterField, 
  parseObsidianMarkdown 
} from '../../src/lib/obsidian/parser.ts';

interface NoteData {
  text: string;
  lang: 'en' | 'ar';
}

/**
 * High-fidelity lifecycle controller simulating the exact interaction between
 * NotesPanel.tsx and PdfNotebookViewer.tsx.
 */
class NotesPanelViewerHarness {
  // PdfNotebookViewer State
  public pageNumber: number = 1;
  public notes: Record<number, NoteData> = {};
  public notesRef: Record<number, NoteData> = {};
  public annotations: Record<number, any[]> = {};
  public annotationsRef: Record<number, any[]> = {};
  public isDirty: boolean = false;
  public prevActivePage: number = 1;
  public saveHistory: Array<{
    page: number;
    savedNotes: Record<number, NoteData>;
    timestamp: number;
  }> = [];

  // NotesPanel State
  public localNote: NoteData = { text: '', lang: 'en' };
  public localNoteRef: NoteData = { text: '', lang: 'en' };
  public currentPageRef: number = 1;
  public debounceTimer: NodeJS.Timeout | null = null;
  public isUnmounted: boolean = false;

  // Network / Persistence Mock
  public networkAvailable: boolean = true;
  public networkFailureCount: number = 0;
  public persistenceStorage: Map<string, string> = new Map();
  public noteId: string = 'test-doc-001';

  constructor(initialNotes: Record<number, NoteData> = {}, initialAnnotations: Record<number, any[]> = {}) {
    this.notes = JSON.parse(JSON.stringify(initialNotes));
    this.notesRef = JSON.parse(JSON.stringify(initialNotes));
    this.annotations = JSON.parse(JSON.stringify(initialAnnotations));
    this.annotationsRef = JSON.parse(JSON.stringify(initialAnnotations));
    this.pageNumber = 1;
    this.prevActivePage = 1;
    this.currentPageRef = 1;
    const initial = this.notes[1] || { text: '', lang: 'en' };
    this.localNote = { ...initial };
    this.localNoteRef = { ...initial };

    const initialFrontmatter = updateFrontmatterField(
      '# Study Document\nNotes content',
      'pdf_notes',
      JSON.stringify({ notes: this.notes, annotations: this.annotations })
    );
    this.persistenceStorage.set(this.noteId, initialFrontmatter);
  }

  public typeText(newText: string) {
    if (this.isUnmounted) throw new Error('Cannot type into unmounted NotesPanel');
    const updated: NoteData = { ...this.localNoteRef, text: newText };
    this.localNote = updated;
    this.localNoteRef = updated;
    this.isDirty = true;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.onNotesPanelChange(this.currentPageRef, this.localNoteRef);
    }, 500);
  }

  public changeLanguage(newLang: 'en' | 'ar') {
    if (this.isUnmounted) throw new Error('Cannot change language on unmounted NotesPanel');
    const updated: NoteData = { ...this.localNoteRef, lang: newLang };
    this.localNote = updated;
    this.localNoteRef = updated;
    this.isDirty = true;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.onNotesPanelChange(this.currentPageRef, updated);
  }

  public addAnnotation(pg: number, annotation: any) {
    this.isDirty = true;
    const updated = {
      ...this.annotations,
      [pg]: [...(this.annotations[pg] || []), annotation]
    };
    this.annotations = updated;
    this.annotationsRef = updated;
  }

  public blurTextarea() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      this.onNotesPanelChange(this.currentPageRef, this.localNoteRef);
    }
  }

  public unmount() {
    this.isUnmounted = true;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      this.onNotesPanelChange(this.currentPageRef, this.localNoteRef);
    }
  }

  private onNotesPanelChange(pg: number, noteData: NoteData) {
    this.isDirty = true;
    const updated = {
      ...this.notes,
      [pg]: { ...noteData }
    };
    this.notes = updated;
    this.notesRef = updated;
  }

  public async jumpToPage(targetPage: number) {
    if (this.pageNumber === targetPage) return;

    // In React commit phase:
    // 1. Child NotesPanel's useEffect runs on pageNumber change:
    if (this.currentPageRef !== targetPage) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
        this.onNotesPanelChange(this.currentPageRef, this.localNoteRef);
      }
      this.currentPageRef = targetPage;
      const nextNote = this.notes[targetPage] || { text: '', lang: 'en' };
      this.localNote = { ...nextNote };
      this.localNoteRef = { ...nextNote };
    }

    // 2. Parent PdfNotebookViewer's useEffect runs on pageNumber change:
    this.pageNumber = targetPage;
    this.prevActivePage = targetPage;

    if (this.isDirty) {
      await this.handleViewerSave();
    }
  }

  public async handleViewerSave(): Promise<{ success: boolean; walId: string | null }> {
    const saveNotes = JSON.parse(JSON.stringify(this.notesRef));
    const saveAnnotations = JSON.parse(JSON.stringify(this.annotationsRef));

    const walPayload = {
      noteId: this.noteId,
      notePath: `Study/${this.noteId}.md`,
      pdfNotes: {
        notes: saveNotes,
        annotations: saveAnnotations
      }
    };

    let walId: string | null = null;
    try {
      walId = await recordMutation({
        type: 'SAVE_PDF_ANNOTATIONS',
        payload: walPayload
      });
    } catch (err) {
      console.warn('WAL record error:', err);
    }

    try {
      if (!this.networkAvailable) {
        this.networkFailureCount++;
        throw new Error(`NetworkError: 503 Service Unavailable (attempt ${this.networkFailureCount})`);
      }

      const existing = this.persistenceStorage.get(this.noteId) || '';
      const notesJson = JSON.stringify({ notes: saveNotes, annotations: saveAnnotations });
      const updatedContent = updateFrontmatterField(existing, 'pdf_notes', notesJson);
      this.persistenceStorage.set(this.noteId, updatedContent);

      if (walId) {
        await markMutationSynced(walId);
      }

      this.isDirty = false;
      this.saveHistory.push({
        page: this.pageNumber,
        savedNotes: saveNotes,
        timestamp: Date.now()
      });

      return { success: true, walId };
    } catch (err: any) {
      if (walId) {
        await markMutationFailed(walId, err?.message || 'Save failed');
      }
      return { success: false, walId };
    }
  }

  public getRenderedStyles(): { dir: 'ltr' | 'rtl'; fontClass: string; textAlign: string } {
    const isArabic = this.localNote.lang === 'ar';
    return {
      dir: isArabic ? 'rtl' : 'ltr',
      fontClass: isArabic ? 'font-[family-name:var(--font-lemonada)]' : 'font-[family-name:var(--font-caveat)]',
      textAlign: isArabic ? 'text-right' : 'text-left'
    };
  }
}

// ============================================================================
// SUITE 1: Rapid Page Switching Stress & Zero Cross-Contamination
// ============================================================================
describe('Suite 1: Rapid Page Switching Stress & Zero Cross-Contamination', () => {

  beforeEach(async () => {
    await resetWALStore();
  });

  it('1.1: Rapid typing on Page 1, immediate jump to Page 5, typing on Page 5, and jump back to Page 1', async () => {
    const harness = new NotesPanelViewerHarness();

    const page1Text = 'Page 1 Analysis: Wavefunction Collapse in Hilbert Space';
    const page5Text = 'Page 5 Summary: Hamiltonian Perturbation Matrix Eigenvalues';

    // 1. User types on Page 1
    harness.typeText(page1Text);
    assert.equal(harness.localNote.text, page1Text);
    assert.ok(harness.debounceTimer !== null);

    // 2. Immediately jump to Page 5 (well before 500ms debounce)
    await new Promise(r => setTimeout(r, 20));
    await harness.jumpToPage(5);

    assert.equal(harness.pageNumber, 5);
    assert.equal(harness.currentPageRef, 5);
    assert.equal(harness.notes[1].text, page1Text, 'Page 1 committed upon page jump');
    assert.equal(harness.localNote.text, '', 'Page 5 starts clean');

    // 3. User types on Page 5
    harness.typeText(page5Text);
    assert.equal(harness.localNote.text, page5Text);
    assert.ok(harness.debounceTimer !== null);

    // 4. Immediately jump back to Page 1 (before 500ms debounce)
    await new Promise(r => setTimeout(r, 25));
    await harness.jumpToPage(1);

    assert.equal(harness.pageNumber, 1);
    assert.equal(harness.notes[5].text, page5Text, 'Page 5 committed upon jump back');
    assert.equal(harness.localNote.text, page1Text, 'Page 1 restored in NotesPanel');
    assert.equal(harness.notes[1].text, page1Text);

    // Zero cross-contamination audit
    assert.notEqual(harness.notes[1].text, harness.notes[5].text);
    assert.ok(!harness.notes[1].text.includes('Page 5'));
    assert.ok(!harness.notes[5].text.includes('Page 1'));

    // Verify backend storage
    const stored = harness.persistenceStorage.get(harness.noteId);
    assert.ok(stored);
    const parsed = parseObsidianMarkdown(stored!, 'test.md');
    const parsedPdfNotes = JSON.parse(parsed.frontmatter.pdf_notes as string);
    assert.equal(parsedPdfNotes.notes[1].text, page1Text);
    assert.equal(parsedPdfNotes.notes[5].text, page5Text);
  });

  it('1.2: High-frequency stress loop (100 rapid cycles across random pages with zero cross-contamination)', async () => {
    const harness = new NotesPanelViewerHarness();
    const totalCycles = 100;
    const pagePool = [1, 2, 3, 5, 8, 13, 21];
    const generatedNotes: Record<number, string> = {};

    for (let i = 0; i < totalCycles; i++) {
      const targetPage = pagePool[i % pagePool.length];
      await harness.jumpToPage(targetPage);

      const uniquePayload = `Cycle_${i}_Page_${targetPage}_Token_${Math.random().toString(36).slice(2, 8)}`;
      harness.typeText(uniquePayload);
      generatedNotes[targetPage] = uniquePayload;

      const briefDelayMs = Math.floor(Math.random() * 10) + 1;
      await new Promise(r => setTimeout(r, briefDelayMs));
    }

    await harness.jumpToPage(1);

    for (const pg of pagePool) {
      const expectedText = generatedNotes[pg];
      assert.ok(expectedText);
      assert.equal(harness.notes[pg]?.text, expectedText);

      for (const otherPg of pagePool) {
        if (otherPg !== pg) {
          assert.notEqual(
            harness.notes[pg]?.text, 
            harness.notes[otherPg]?.text, 
            `Page ${pg} and Page ${otherPg} must not cross-contaminate`
          );
        }
      }
    }
  });

  it('1.3: Blur event before page flip commits immediately without waiting for debounce', async () => {
    const harness = new NotesPanelViewerHarness();
    harness.typeText('Critical thought typed before clicking outside');
    assert.ok(harness.debounceTimer !== null);

    harness.blurTextarea();
    assert.equal(harness.debounceTimer, null);
    assert.equal(harness.notes[1]?.text, 'Critical thought typed before clicking outside');

    await harness.jumpToPage(2);
    assert.equal(harness.notes[1]?.text, 'Critical thought typed before clicking outside');
  });

  it('1.4: Immediate unmount after typing flushes pending text cleanly', async () => {
    const harness = new NotesPanelViewerHarness();
    harness.typeText('Final unsaved thought before closing modal');
    assert.ok(harness.debounceTimer !== null);

    harness.unmount();
    assert.equal(harness.isUnmounted, true);
    assert.equal(harness.debounceTimer, null);
    assert.equal(harness.notes[1]?.text, 'Final unsaved thought before closing modal');
  });

  it('1.5: Multi-hop cascade (1 -> 5 -> 10 -> 2 -> 1) preserves all intermediate page notes', async () => {
    const harness = new NotesPanelViewerHarness();

    const hops = [
      { page: 1, text: 'Hop 1: Genesis Notes' },
      { page: 5, text: 'Hop 2: Middle Chapter Reflections' },
      { page: 10, text: 'Hop 3: Mathematical Proof Appendix' },
      { page: 2, text: 'Hop 4: Early Correction to Chapter 1' },
    ];

    for (const hop of hops) {
      await harness.jumpToPage(hop.page);
      harness.typeText(hop.text);
      await new Promise(r => setTimeout(r, 15));
    }

    // Final hop back to Page 1
    await harness.jumpToPage(1);

    for (const hop of hops) {
      assert.equal(harness.notes[hop.page].text, hop.text, `Hop to page ${hop.page} must be preserved`);
    }
  });

  it('1.6: Interleaved annotations and notes auto-flush simultaneously with zero loss', async () => {
    const harness = new NotesPanelViewerHarness();

    // Page 1: Type note and add highlight
    harness.typeText('Page 1 comprehensive review');
    harness.addAnnotation(1, { id: 'hl-1', type: 'highlight', startX: 50, startY: 100, w: 200, h: 25, color: '#fef08a' });

    // Jump to Page 2
    await harness.jumpToPage(2);
    harness.typeText('Page 2 note');
    harness.addAnnotation(2, { id: 'txt-1', type: 'text', x: 80, y: 150, text: 'Page 2 Margin Note', color: '#9333ea' });

    // Jump to Page 3
    await harness.jumpToPage(3);

    // Verify storage has both notes and annotations preserved
    const stored = harness.persistenceStorage.get(harness.noteId);
    assert.ok(stored);
    const parsed = parseObsidianMarkdown(stored!, 'test.md');
    const pdfNotes = JSON.parse(parsed.frontmatter.pdf_notes as string);

    assert.equal(pdfNotes.notes[1].text, 'Page 1 comprehensive review');
    assert.equal(pdfNotes.annotations[1].length, 1);
    assert.equal(pdfNotes.annotations[1][0].id, 'hl-1');

    assert.equal(pdfNotes.notes[2].text, 'Page 2 note');
    assert.equal(pdfNotes.annotations[2].length, 1);
    assert.equal(pdfNotes.annotations[2][0].id, 'txt-1');
  });
});

// ============================================================================
// SUITE 2: Network Interruption & Auto-Flush on Page Flip (Offline WAL)
// ============================================================================
describe('Suite 2: Network Interruption & Auto-Flush on Page Flip', () => {

  beforeEach(async () => {
    await resetWALStore();
  });

  it('2.1: Supabase failure during page flip buffers mutation in Offline WAL with synced: false', async () => {
    const harness = new NotesPanelViewerHarness();
    harness.typeText('Important note while on train entering tunnel');

    harness.networkAvailable = false;
    await harness.jumpToPage(2);

    assert.equal(harness.networkFailureCount, 1);

    const pendingMutations = await getPendingMutations();
    assert.equal(pendingMutations.length, 1);

    const walRecord = pendingMutations[0];
    assert.equal(walRecord.type, 'SAVE_PDF_ANNOTATIONS');
    assert.equal(walRecord.synced, false);
    assert.equal(walRecord.retryCount, 1);
    assert.ok(walRecord.error?.includes('503 Service Unavailable'));
    assert.equal(walRecord.payload.pdfNotes.notes[1].text, 'Important note while on train entering tunnel');
  });

  it('2.2: Multi-page navigation during total blackout queues all mutations in FIFO order', async () => {
    const harness = new NotesPanelViewerHarness();
    harness.networkAvailable = false;

    const pageNotes = [
      { page: 1, text: 'Blackout Note Page 1' },
      { page: 2, text: 'Blackout Note Page 2' },
      { page: 3, text: 'Blackout Note Page 3' },
      { page: 4, text: 'Blackout Note Page 4' },
    ];

    for (const item of pageNotes) {
      await harness.jumpToPage(item.page);
      harness.typeText(item.text);
      await new Promise(r => setTimeout(r, 10));
    }

    await harness.jumpToPage(5);

    const pending = await getPendingMutations();
    assert.ok(pending.length >= 4);

    for (const record of pending) {
      assert.equal(record.synced, false);
      assert.ok((record.retryCount || 0) >= 1);
    }

    for (let i = 1; i < pending.length; i++) {
      assert.ok(pending[i].timestamp >= pending[i - 1].timestamp);
    }

    const latestMutation = pending[pending.length - 1];
    const storedNotes = latestMutation.payload.pdfNotes.notes;
    assert.equal(storedNotes[1].text, 'Blackout Note Page 1');
    assert.equal(storedNotes[2].text, 'Blackout Note Page 2');
    assert.equal(storedNotes[3].text, 'Blackout Note Page 3');
    assert.equal(storedNotes[4].text, 'Blackout Note Page 4');
  });

  it('2.3: Reconnect replays pending mutations cleanly and clears pending backlog', async () => {
    const harness = new NotesPanelViewerHarness();
    harness.networkAvailable = false;

    harness.typeText('Page 1 Offline Data');
    await harness.jumpToPage(2);

    harness.typeText('Page 2 Offline Data');
    await harness.jumpToPage(3);

    const initialPending = await getPendingMutations();
    assert.ok(initialPending.length > 0);

    harness.networkAvailable = true;

    const replayResult = await flushPendingMutations(async (mutation: MutationRecord) => {
      const existing = harness.persistenceStorage.get(mutation.payload.noteId) || '';
      const notesJson = JSON.stringify(mutation.payload.pdfNotes);
      const updated = updateFrontmatterField(existing, 'pdf_notes', notesJson);
      harness.persistenceStorage.set(mutation.payload.noteId, updated);
      return true;
    });

    assert.equal(replayResult.success, true);
    assert.equal(replayResult.pendingCount, 0);
    assert.equal(replayResult.errors.length, 0);

    const postReplayPending = await getPendingMutations();
    assert.equal(postReplayPending.length, 0);

    const stored = harness.persistenceStorage.get(harness.noteId);
    assert.ok(stored);
    const parsed = parseObsidianMarkdown(stored!, 'test.md');
    const parsedNotes = JSON.parse(parsed.frontmatter.pdf_notes as string);
    assert.equal(parsedNotes.notes[1].text, 'Page 1 Offline Data');
    assert.equal(parsedNotes.notes[2].text, 'Page 2 Offline Data');
  });

  it('2.4: Flaky network recovers on subsequent retry attempt', async () => {
    const harness = new NotesPanelViewerHarness();
    harness.networkAvailable = false;

    harness.typeText('Flaky network test note');
    await harness.jumpToPage(2);

    const pending = await getPendingMutations();
    assert.equal(pending.length, 1);

    // 1st Replay attempt fails
    const failReplay = await flushPendingMutations(async () => {
      return false;
    });
    assert.equal(failReplay.success, false);
    assert.equal(failReplay.pendingCount, 1);

    // 2nd Replay attempt succeeds
    const successReplay = await flushPendingMutations(async () => {
      return true;
    });
    assert.equal(successReplay.success, true);
    assert.equal(successReplay.pendingCount, 0);

    const afterSuccess = await getPendingMutations();
    assert.equal(afterSuccess.length, 0);
  });

  it('2.5: Network flapping (online -> offline -> online -> offline -> online) guarantees zero lost states', async () => {
    const harness = new NotesPanelViewerHarness();

    // 1. Online: Page 1 saved
    harness.networkAvailable = true;
    harness.typeText('State 1: Online initial');
    await harness.jumpToPage(2);

    let pending = await getPendingMutations();
    assert.equal(pending.length, 0, 'Online save must have 0 pending in WAL');

    // 2. Offline: Page 2 saved
    harness.networkAvailable = false;
    harness.typeText('State 2: First blackout');
    await harness.jumpToPage(3);

    pending = await getPendingMutations();
    assert.equal(pending.length, 1, 'First blackout must buffer 1 mutation');

    // 3. Online: Reconnect & flush
    harness.networkAvailable = true;
    await flushPendingMutations(async (m) => {
      const existing = harness.persistenceStorage.get(m.payload.noteId) || '';
      const updated = updateFrontmatterField(existing, 'pdf_notes', JSON.stringify(m.payload.pdfNotes));
      harness.persistenceStorage.set(m.payload.noteId, updated);
      return true;
    });

    pending = await getPendingMutations();
    assert.equal(pending.length, 0, 'Flushed queue must be 0');

    // 4. Offline again: Page 3 saved
    harness.networkAvailable = false;
    harness.typeText('State 3: Second blackout');
    await harness.jumpToPage(4);

    pending = await getPendingMutations();
    assert.equal(pending.length, 1, 'Second blackout must buffer 1 mutation');

    // 5. Online final: Reconnect & flush
    harness.networkAvailable = true;
    await flushPendingMutations(async (m) => {
      const existing = harness.persistenceStorage.get(m.payload.noteId) || '';
      const updated = updateFrontmatterField(existing, 'pdf_notes', JSON.stringify(m.payload.pdfNotes));
      harness.persistenceStorage.set(m.payload.noteId, updated);
      return true;
    });

    pending = await getPendingMutations();
    assert.equal(pending.length, 0, 'Final queue must be 0');

    // Verify all 3 states exist in backend storage
    const stored = harness.persistenceStorage.get(harness.noteId);
    const parsed = parseObsidianMarkdown(stored!, 'test.md');
    const parsedNotes = JSON.parse(parsed.frontmatter.pdf_notes as string);
    assert.equal(parsedNotes.notes[1].text, 'State 1: Online initial');
    assert.equal(parsedNotes.notes[2].text, 'State 2: First blackout');
    assert.equal(parsedNotes.notes[3].text, 'State 3: Second blackout');
  });
});

// ============================================================================
// SUITE 3: Language Switcher, Handwriting Fonts & BiDi Preservation
// ============================================================================
describe('Suite 3: Language Switcher, Handwriting Fonts & BiDi Preservation', () => {

  beforeEach(async () => {
    await resetWALStore();
  });

  it('3.1: Language and font settings persist strictly per page (English Caveat LTR vs Arabic Lemonada RTL)', async () => {
    const harness = new NotesPanelViewerHarness();

    // Page 1: English Caveat LTR
    harness.changeLanguage('en');
    harness.typeText('Page 1 in English with handwritten Caveat typography');
    const p1Style = harness.getRenderedStyles();
    assert.equal(p1Style.dir, 'ltr');
    assert.equal(p1Style.fontClass, 'font-[family-name:var(--font-caveat)]');
    assert.equal(p1Style.textAlign, 'text-left');

    // Navigate to Page 2: Arabic Lemonada RTL
    await harness.jumpToPage(2);
    harness.changeLanguage('ar');
    harness.typeText('الصفحة الثانية مكتوبة باللغة العربية مع خط ليمونادا الجميل');
    const p2Style = harness.getRenderedStyles();
    assert.equal(p2Style.dir, 'rtl');
    assert.equal(p2Style.fontClass, 'font-[family-name:var(--font-lemonada)]');
    assert.equal(p2Style.textAlign, 'text-right');

    // Navigate to Page 3: English
    await harness.jumpToPage(3);
    harness.changeLanguage('en');
    harness.typeText('Page 3 English text');

    // Switch back to Page 2: Verify Arabic Lemonada RTL is preserved
    await harness.jumpToPage(2);
    assert.equal(harness.localNote.lang, 'ar');
    assert.equal(harness.localNote.text, 'الصفحة الثانية مكتوبة باللغة العربية مع خط ليمونادا الجميل');
    const p2ReturnStyle = harness.getRenderedStyles();
    assert.equal(p2ReturnStyle.dir, 'rtl');
    assert.equal(p2ReturnStyle.fontClass, 'font-[family-name:var(--font-lemonada)]');
    assert.equal(p2ReturnStyle.textAlign, 'text-right');

    // Switch back to Page 1: Verify English Caveat LTR is preserved
    await harness.jumpToPage(1);
    assert.equal(harness.localNote.lang, 'en');
    assert.equal(harness.localNote.text, 'Page 1 in English with handwritten Caveat typography');
    const p1ReturnStyle = harness.getRenderedStyles();
    assert.equal(p1ReturnStyle.dir, 'ltr');
    assert.equal(p1ReturnStyle.fontClass, 'font-[family-name:var(--font-caveat)]');
    assert.equal(p1ReturnStyle.textAlign, 'text-left');
  });

  it('3.2: In-place language toggling on the same page switches direction and font immediately', async () => {
    const harness = new NotesPanelViewerHarness();

    harness.typeText('Bilingual study thought');
    assert.equal(harness.getRenderedStyles().dir, 'ltr');
    assert.equal(harness.getRenderedStyles().fontClass, 'font-[family-name:var(--font-caveat)]');

    harness.changeLanguage('ar');
    assert.equal(harness.localNote.lang, 'ar');
    assert.equal(harness.localNote.text, 'Bilingual study thought');
    assert.equal(harness.getRenderedStyles().dir, 'rtl');
    assert.equal(harness.getRenderedStyles().fontClass, 'font-[family-name:var(--font-lemonada)]');
    assert.equal(harness.notes[1].lang, 'ar');

    harness.changeLanguage('en');
    assert.equal(harness.localNote.lang, 'en');
    assert.equal(harness.getRenderedStyles().dir, 'ltr');
    assert.equal(harness.getRenderedStyles().fontClass, 'font-[family-name:var(--font-caveat)]');
    assert.equal(harness.notes[1].lang, 'en');
  });

  it('3.3: Complex Arabic Unicode, diacritics, and quotes roundtrip through YAML frontmatter without corruption', async () => {
    const harness = new NotesPanelViewerHarness();

    const complexArabic = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ - قَالَ: "هَذَا بَيَانٌ لِّلنَّاسِ" (100% دِقَّة)';
    const complexEnglish = 'Special symbols: \'single quotes\', "double quotes", colons: and newlines\nsecond line';

    // Page 1: Arabic
    harness.changeLanguage('ar');
    harness.typeText(complexArabic);

    // Page 2: English
    await harness.jumpToPage(2);
    harness.changeLanguage('en');
    harness.typeText(complexEnglish);
    harness.blurTextarea();

    await harness.handleViewerSave();

    const rawStored = harness.persistenceStorage.get(harness.noteId);
    assert.ok(rawStored);

    const parsedNote = parseObsidianMarkdown(rawStored!, 'test.md');
    assert.ok(parsedNote.frontmatter.pdf_notes);

    const parsedPdfNotes = JSON.parse(parsedNote.frontmatter.pdf_notes as string);

    assert.equal(parsedPdfNotes.notes[1].lang, 'ar');
    assert.equal(parsedPdfNotes.notes[1].text, complexArabic);
    assert.equal(parsedPdfNotes.notes[2].lang, 'en');
    assert.equal(parsedPdfNotes.notes[2].text, complexEnglish);
  });

  it('3.4: Deep BiDi stress with Arabic Tatweel, eastern Arabic numerals, and Quranic punctuation', async () => {
    const harness = new NotesPanelViewerHarness();

    const bidiCorpus = [
      'تَـــــطْـــــوِيـــــلٌ كَـــــبِـــــيـــــرٌ لِلاخْتِبَارِ',
      'الأرقام المشرقية: ٠١٢٣٤٥٦٧٨٩ مع نسب مئوية ٪٩٩.٩',
      'علامات ترقيم عربية: «فاصلة، ونقطتان: وعلامة استفهام؟ وعلامة تعجب!»',
      'نص هجين: Hybrid AI Models تدعم خوارزمية Linear Projection بنسبة 100%.'
    ];

    for (let i = 0; i < bidiCorpus.length; i++) {
      const page = i + 1;
      await harness.jumpToPage(page);
      harness.changeLanguage('ar');
      harness.typeText(bidiCorpus[i]);
      harness.blurTextarea();
    }

    await harness.handleViewerSave();

    const stored = harness.persistenceStorage.get(harness.noteId);
    const parsed = parseObsidianMarkdown(stored!, 'test.md');
    const parsedNotes = JSON.parse(parsed.frontmatter.pdf_notes as string);

    for (let i = 0; i < bidiCorpus.length; i++) {
      const page = i + 1;
      assert.equal(parsedNotes.notes[page].lang, 'ar');
      assert.equal(parsedNotes.notes[page].text, bidiCorpus[i], `Page ${page} Arabic text must be 100% bit-exact`);
    }
  });
});
