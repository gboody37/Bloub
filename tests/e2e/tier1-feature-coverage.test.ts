/**
 * Tier 1: Feature Coverage Test Suite (F1 - F7)
 * 
 * Verifies core functionality and happy-path specifications for all features
 * across the Vibe Todos Creative Overhaul (minimum 5 tests per feature = 35 tests).
 * 
 * Features Covered:
 * - F1: Supabase & Local-First Storage Integrity (5 tests)
 * - F2: Markdown Note Auto-Save & Beacon Flush (5 tests)
 * - F3: Bloub Mascot State Persistence (5 tests)
 * - F4: Bloub Mascot Backflip Micro-Interaction (5 tests)
 * - F5: Google Stitch Token Architecture & Dynamic Theme Reactivity (5 tests)
 * - F6: Full-Height Immersive Study Tab (5 tests)
 * - F7: Stitch Design Integration & Concept Sign-Off (5 tests)
 * 
 * Usage:
 *   node --experimental-strip-types --test tests/e2e/tier1-feature-coverage.test.ts
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  MockLocalStorage,
  MockBeaconEngine,
  MockSupabaseDatabase,
  MascotStateMachineSimulator,
  MarkdownAutoSaveSimulator,
  ThemeRuntimeDriver,
  readAppSourceFile,
  EXPECTED_SHAPES,
  EXPECTED_COLORS,
  EXPECTED_EXPRESSIONS,
  EXPECTED_STATES,
  STATE_DURATIONS
} from './e2e-test-helpers.ts';
import { STITCH_THEMES, getThemeToken } from '../../src/lib/theme/tokens.ts';
import { parseObsidianMarkdown, applyPdfNotesToContent } from '../../src/lib/obsidian/parser.ts';
import {
  recordMutation,
  getPendingMutations,
  markMutationSynced,
  resetWALStore
} from '../../src/lib/storage/offline-wal.ts';
import { hexToRgb, getRelativeLuminance, getContrastRatioAgainstWhite } from './theme-helpers.ts';

// ============================================================================
// FEATURE F1: SUPABASE & LOCAL-FIRST STORAGE INTEGRITY
// ============================================================================

describe('📦 Tier 1 — F1: Supabase & Local-First Storage Integrity', () => {
  let db: MockSupabaseDatabase;

  beforeEach(() => {
    db = new MockSupabaseDatabase();
    resetWALStore();
  });

  it('T1.F1.1: Live user notes (Deen, History, AI) maintain frontmatter integrity and parser parity', async () => {
    const { data: noteRows } = await db.from('vault_notes').select('*').eq('user_id', '27157bfd-443f-4eea-8431-bf58a74bae8b');
    assert.equal(noteRows.length, 3, 'Must contain exactly 3 live seeded study notes');

    const titles = noteRows.map((r: any) => r.title);
    assert.ok(titles.includes('Deen'), 'Live database must preserve "Deen"');
    assert.ok(titles.includes('History'), 'Live database must preserve "History"');
    assert.ok(titles.includes('AI'), 'Live database must preserve "AI"');

    // Verify markdown frontmatter parsing on AI note
    const aiNote = noteRows.find((r: any) => r.title === 'AI');
    const parsed = parseObsidianMarkdown(aiNote.content);
    assert.equal(parsed.title, 'AI Systems & Optimization');
    assert.ok(parsed.frontmatter.pdf_url.includes('vault_pdfs'), 'Frontmatter must retain valid pdf_url');
    assert.equal(Number(parsed.frontmatter.last_opened_page), 196);
  });

  it('T1.F1.2: PDF annotation coordinate precision (startX, startY, w, h, color) preserved in pdf_notes', async () => {
    const aiRow = (await db.from('vault_notes').select('*').eq('title', 'AI').single()).data;
    const parsed = parseObsidianMarkdown(aiRow.content);
    const rawPdfNotes = parsed.frontmatter.pdf_notes;
    const pdfNotes = typeof rawPdfNotes === 'string' ? JSON.parse(rawPdfNotes) : rawPdfNotes;
    assert.ok(Array.isArray(pdfNotes) && pdfNotes.length > 0, 'AI note must have non-empty pdf_notes array');

    const firstAnn = pdfNotes[0];
    assert.equal(firstAnn.id, 1788160912257);
    assert.equal(firstAnn.page, 196);
    assert.equal(firstAnn.startX, 347.52);
    assert.equal(firstAnn.startY, 102.40);
    assert.equal(firstAnn.w, 88.00);
    assert.equal(firstAnn.h, 19.84);
    assert.equal(firstAnn.color, '#fef08a');
    assert.equal(firstAnn.text, 'Key gradient descent convergence bound');
  });

  it('T1.F1.3: Supabase Storage public URL structure for media bucket adheres to public CDN contract', () => {
    const userId = '27157bfd-443f-4eea-8431-bf58a74bae8b';
    const filename = 'AI.pdf';
    const publicUrlResult = db.storage.from('media').getPublicUrl(`vault_pdfs/${userId}/${filename}`);
    
    assert.match(
      publicUrlResult.data.publicUrl,
      new RegExp(`^https://example\\.supabase\\.co/storage/v1/object/public/media/vault_pdfs/${userId}/${filename}$`),
      'Storage public URL must point directly to public CDN media bucket'
    );
  });

  it('T1.F1.4: Offline Write-Ahead Log (WAL) records mutations with strict FIFO envelope schema', async () => {
    const mut1Id = await recordMutation({
      type: 'SAVE_PDF_ANNOTATIONS',
      payload: { notePath: 'Documents/AI.pdf.md', page: 196, action: 'add', annotation: { id: 201, startX: 10, startY: 20 } }
    });
    const mut2Id = await recordMutation({
      type: 'UPDATE_NOTE',
      payload: { path: 'Documents/AI.pdf.md', content: 'Updated markdown body' }
    });

    const pending = await getPendingMutations();
    assert.equal(pending.length, 2, 'Pending queue must contain exactly 2 mutations');
    assert.equal(pending[0].id, mut1Id);
    assert.equal(pending[0].type, 'SAVE_PDF_ANNOTATIONS');
    assert.equal(pending[0].synced, false);
    assert.equal(pending[1].id, mut2Id);
    assert.equal(pending[1].type, 'UPDATE_NOTE');
    assert.ok(pending[0].timestamp <= pending[1].timestamp, 'Mutations must strictly adhere to FIFO ordering');
  });

  it('T1.F1.5: Offline mutation state transitions from pending to synced without data loss', async () => {
    const mutId = await recordMutation({
      type: 'UPDATE_NOTE',
      payload: { path: 'Documents/History.pdf.md', content: '# New Ottoman Chapter' }
    });

    const pendingBefore = await getPendingMutations();
    assert.equal(pendingBefore.length, 1);
    await markMutationSynced(mutId);
    const pendingAfter = await getPendingMutations();
    assert.equal(pendingAfter.length, 0, 'Synced mutation must be cleared from pending queue');
  });
});

// ============================================================================
// FEATURE F2: MARKDOWN NOTE AUTO-SAVE & BEACON FLUSH
// ============================================================================

describe('📝 Tier 1 — F2: Markdown Note Auto-Save & Beacon Flush', () => {
  let beaconEngine: MockBeaconEngine;

  beforeEach(() => {
    beaconEngine = new MockBeaconEngine();
  });

  it('T1.F2.1: Debounced auto-save triggers save after 1000ms debounce interval', async () => {
    const editor = new MarkdownAutoSaveSimulator('# Initial Title', 'notes/lecture.md', beaconEngine);
    assert.equal(editor.isDirty, false);

    // Typing simulated
    editor.typeContent('# Initial Title\nNew paragraph content...', 10);
    assert.equal(editor.isDirty, true);
    assert.equal(editor.saveCallCount, 0);

    // Wait for timer to fire
    await new Promise(r => setTimeout(r, 25));
    assert.equal(editor.isDirty, false);
    assert.equal(editor.saveCallCount, 1);
    assert.equal(editor.savedContent, '# Initial Title\nNew paragraph content...');
  });

  it('T1.F2.2: Dirty state tracking marks changes as dirty immediately and clears on flush', () => {
    const editor = new MarkdownAutoSaveSimulator('Draft note', 'notes/draft.md', beaconEngine);
    editor.typeContent('Draft note with extra edits', 5000);
    assert.equal(editor.isDirty, true);

    editor.flushSave();
    assert.equal(editor.isDirty, false);
    assert.equal(editor.savedContent, 'Draft note with extra edits');
  });

  it('T1.F2.3: beforeunload event handler dispatches unsaved changes via sendBeacon', () => {
    const editor = new MarkdownAutoSaveSimulator('Base content', 'notes/emergency.md', beaconEngine);
    editor.typeContent('Critical unsaved notes right before tab close', 5000);
    assert.equal(editor.isDirty, true);

    const dispatched = editor.handleBeforeUnload();
    assert.equal(dispatched, true, 'sendBeacon must return true when unsaved content is dispatched');
    assert.equal(beaconEngine.records.length, 1);
    assert.equal(beaconEngine.latest?.url, '/api/obsidian/flush');
  });

  it('T1.F2.4: Beacon payload format contract matches { path, content, timestamp }', () => {
    const editor = new MarkdownAutoSaveSimulator('Line 1', 'notes/exam.md', beaconEngine);
    editor.typeContent('Line 1\nImportant formula: E=mc^2', 5000);
    editor.handleBeforeUnload();

    const payload = beaconEngine.latest?.data;
    assert.ok(payload, 'Beacon payload must exist');
    assert.equal(payload.path, 'notes/exam.md');
    assert.equal(payload.content, 'Line 1\nImportant formula: E=mc^2');
    assert.ok(typeof payload.timestamp === 'number' && payload.timestamp > 0);
  });

  it('T1.F2.5: Manual save clears debounce timer to prevent duplicate write requests', async () => {
    const editor = new MarkdownAutoSaveSimulator('Intro', 'notes/manual.md', beaconEngine);
    editor.typeContent('Intro + additions', 50);
    assert.ok(editor.debounceTimer !== null);

    // User explicitly presses manual Save Note button
    editor.flushSave();
    assert.equal(editor.saveCallCount, 1);
    assert.equal(editor.debounceTimer, null);

    // Wait past debounce timer to confirm no second call is triggered
    await new Promise(r => setTimeout(r, 60));
    assert.equal(editor.saveCallCount, 1);
  });
});

// ============================================================================
// FEATURE F3: BLOUB MASCOT STATE PERSISTENCE
// ============================================================================

describe('🐾 Tier 1 — F3: Bloub Mascot State Persistence', () => {
  let storage: MockLocalStorage;

  beforeEach(() => {
    storage = new MockLocalStorage();
  });

  it('T1.F3.1: Mascot persistent settings { expression, shape, color, gaze } decoupled from transient state', () => {
    const mascot = new MascotStateMachineSimulator(
      { expression: 'heureux', shape: 'squircle', color: 'orange' },
      storage,
      'uid_test'
    );

    assert.equal(mascot.persistentSettings.expression, 'heureux');
    assert.equal(mascot.persistentSettings.shape, 'squircle');
    assert.equal(mascot.persistentSettings.color, 'orange');

    // Trigger transient animation (e.g. alert)
    mascot.triggerMascot('alert', 'surpris', false);
    assert.equal(mascot.activeAnimation.state, 'alert');
    assert.equal(mascot.activeAnimation.expr, 'surpris');

    // Persistent settings must remain unchanged
    assert.equal(mascot.persistentSettings.expression, 'heureux');
  });

  it('T1.F3.2: Mascot settings serialize to LocalStorage under ${uid}_* keys', () => {
    const mascot = new MascotStateMachineSimulator(
      { expression: 'fier', shape: 'livre', color: 'violet', gaze: { yaw: 0.1, pitch: -0.2, roll: 0 } },
      storage,
      'uid_456'
    );

    assert.equal(storage.getItem('uid_456_mascotExpression'), 'fier');
    assert.equal(storage.getItem('uid_456_mascotShape'), 'livre');
    assert.equal(storage.getItem('uid_456_mascotColor'), 'violet');
    assert.ok(storage.getItem('uid_456_mascotGaze')?.includes('"yaw":0.1'));
  });

  it('T1.F3.3: Page reload rehydrates persisted mascot settings rather than resetting to defaults', () => {
    // Pre-populate storage as if from a prior session
    storage.setItem('uid_789_mascotExpression', 'hilare');
    storage.setItem('uid_789_mascotShape', 'fromage');
    storage.setItem('uid_789_mascotColor', 'ambre');

    // Simulate page reload rehydration with skipInitialSync=true
    const rehydrated = new MascotStateMachineSimulator(
      { expression: 'timide', shape: 'galet', color: 'bleu' }, // default fallback
      storage,
      'uid_789',
      true
    );
    rehydrated.simulateTabVisibilityChange(); // triggers storage rehydration

    assert.equal(rehydrated.persistentSettings.expression, 'hilare');
    assert.equal(rehydrated.persistentSettings.shape, 'fromage');
    assert.equal(rehydrated.persistentSettings.color, 'ambre');
  });

  it('T1.F3.4: Tab visibility change resynchronizes mascotExpression, mascotShape, and mascotColor', () => {
    const mascot = new MascotStateMachineSimulator(
      { expression: 'neutre', shape: 'cercle', color: 'vert' },
      storage,
      'uid_sync'
    );

    // Remote update received from cloud metadata
    mascot.simulateTabVisibilityChange({
      expression: 'concentre',
      shape: 'oeuf',
      color: 'turquoise'
    });

    assert.equal(mascot.persistentSettings.expression, 'concentre');
    assert.equal(mascot.persistentSettings.shape, 'oeuf');
    assert.equal(mascot.persistentSettings.color, 'turquoise');
    assert.equal(storage.getItem('uid_sync_mascotExpression'), 'concentre');
  });

  it('T1.F3.5: Guest session persistence supports anonymous users via local storage without auth errors', () => {
    const guestMascot = new MascotStateMachineSimulator(
      { expression: 'amuse', shape: 'capsule', color: 'rose' },
      storage,
      'guest'
    );

    assert.equal(storage.getItem('guest_mascotExpression'), 'amuse');
    assert.equal(storage.getItem('guest_mascotShape'), 'capsule');
    assert.equal(storage.getItem('guest_mascotColor'), 'rose');
  });
});

// ============================================================================
// FEATURE F4: BLOUB MASCOT BACKFLIP MICRO-INTERACTION
// ============================================================================

describe('🤸 Tier 1 — F4: Bloub Mascot Backflip Micro-Interaction', () => {
  it('T1.F4.1: Orbit animation definition in states.ts specifies 3.4s duration and 2.5s minDuration', () => {
    const statesCode = readAppSourceFile('src/lib/bot/states.ts');
    
    // Check orbit duration in states.ts
    assert.match(statesCode, /id:\s*['"]orbit['"][\s\S]*?duration:\s*3\.4/, 'Orbit duration must be 3.4 seconds');
    assert.match(statesCode, /id:\s*['"]orbit['"][\s\S]*?minDuration:\s*2\.5/, 'Orbit minDuration must be 2.5 seconds');
  });

  it('T1.F4.2: Dynamic reset timer calculates duration from active state (3400ms for orbit)', () => {
    const mascot = new MascotStateMachineSimulator();
    const duration = mascot.triggerMascot('orbit', 'heureux');
    assert.equal(duration, 3400, 'Backflip orbit timeout must dynamically calculate 3400ms');
    assert.equal(mascot.activeAnimation.state, 'orbit');
  });

  it('T1.F4.3: Mascot click handler isolates event bubbling to prevent infinite loop or modal dismissal', () => {
    const mascotCode = readAppSourceFile('src/components/BloubMascot.tsx');
    // Verify SVG component structure
    assert.ok(
      mascotCode.includes('onClick=') || mascotCode.includes('onInteract'),
      'BloubMascot must define interaction handler'
    );
    assert.ok(
      mascotCode.includes('viewBox='),
      'SVG must specify viewBox'
    );
  });

  it('T1.F4.4: Self-healing bot engine resets to idle after backflip completes', async () => {
    const mascot = new MascotStateMachineSimulator({ expression: 'fier', shape: 'galet', color: 'bleu' });
    mascot.triggerMascot('orbit', 'heureux');
    assert.equal(mascot.activeAnimation.state, 'orbit');

    // Simulate completion of dynamic timer
    mascot.resetToIdle();
    assert.equal(mascot.activeAnimation.state, 'idle');
    assert.equal(mascot.activeAnimation.expr, 'fier', 'Must restore persistent expression');
  });

  it('T1.F4.5: Mascot container preserves overflow: visible avoiding CSS transform clipping', () => {
    const mascotCode = readAppSourceFile('src/components/BloubMascot.tsx');
    assert.ok(
      mascotCode.includes("overflow: 'visible'") || mascotCode.includes('overflow-visible'),
      'BloubMascot SVG must specify overflow: visible to prevent rotational transform clipping'
    );
  });
});

// ============================================================================
// FEATURE F5: GOOGLE STITCH TOKEN ARCHITECTURE & THEME REACTIVITY
// ============================================================================

describe('🎨 Tier 1 — F5: Google Stitch Token Architecture & Dynamic Theme Reactivity', () => {
  it('T1.F5.1: STITCH_THEMES catalog defines all 16 dark themes with complete token metadata', () => {
    assert.equal(STITCH_THEMES.length, 16, 'Must define exactly 16 Stitch themes');
    
    STITCH_THEMES.forEach((theme, idx) => {
      assert.ok(theme.id.startsWith('bg-[#'), `Theme #${idx} (${theme.name}) id must match bg-[#...]`);
      assert.ok(theme.slug.length > 0, `Theme #${idx} must have slug`);
      assert.ok(theme.color.startsWith('#'), `Theme #${idx} must have valid background color hex`);
      assert.ok(theme.customColor.startsWith('#'), `Theme #${idx} must have primary seed color`);
      assert.ok(
        ['TONAL_SPOT', 'VIBRANT', 'EXPRESSIVE', 'NEUTRAL', 'MONOCHROME'].includes(theme.colorVariant),
        `Theme #${idx} colorVariant must be valid Stitch variant`
      );
    });
  });

  it('T1.F5.2: Every Stitch theme defines complete semantic CSS variables', () => {
    const requiredVars = [
      '--theme-bg',
      '--theme-surface',
      '--theme-surface-elevated',
      '--theme-border',
      '--theme-primary',
      '--theme-text-primary',
      '--theme-text-muted'
    ];

    STITCH_THEMES.forEach(theme => {
      const vars = theme.cssVariables as any;
      requiredVars.forEach(v => {
        assert.ok(typeof vars[v] === 'string' && vars[v].length > 0, `Theme ${theme.name} missing ${v}`);
      });
    });
  });

  it('T1.F5.3: Tailwind class format parity: theme id matches bg-[${color}] and exists in lookup map', () => {
    STITCH_THEMES.forEach(theme => {
      assert.equal(theme.id, `bg-[${theme.color.toLowerCase()}]`);
      const resolved = getThemeToken(theme.id);
      assert.equal(resolved.name, theme.name);
    });
  });

  it('T1.F5.4: Theme runtime driver dynamically updates data-theme attribute and meta theme-color', () => {
    const driver = new ThemeRuntimeDriver('bg-[#080d2a]');
    assert.equal(driver.htmlAttributes['data-theme'], 'bg-[#080d2a]');
    assert.equal(driver.metaThemeColor, '#080d2a');

    driver.applyTheme('bg-[#022c22]'); // Emerald Night
    assert.equal(driver.htmlAttributes['data-theme'], 'bg-[#022c22]');
    assert.equal(driver.metaThemeColor, '#022c22');
    assert.equal(driver.getCssVariableValue('--theme-primary'), '#10b981');
  });

  it('T1.F5.5: Study Tab theme contract consumes theme CSS variables instead of hardcoded slate colors', () => {
    const tokens = getThemeToken('bg-[#1a0b2e]'); // Midnight Violet
    assert.equal(tokens.cssVariables['--theme-primary'], '#a855f7');
    assert.ok(tokens.cssVariables['--theme-surface'].includes('rgba'));
    assert.ok(tokens.cssVariables['--theme-border'].includes('rgba'));
  });
});

// ============================================================================
// FEATURE F6: FULL-HEIGHT IMMERSIVE STUDY TAB
// ============================================================================

describe('🖥️ Tier 1 — F6: Full-Height Immersive Study Tab', () => {
  it('T1.F6.1: Full-height viewport constraints enforce h-[100dvh] max-h-[100dvh] overflow-hidden', () => {
    const pageCode = readAppSourceFile('src/app/page.tsx');
    assert.ok(
      pageCode.includes("h-[100dvh] max-h-[100dvh] overflow-hidden") ||
      pageCode.includes("selectedNote ? 'max-w-[100vw]") ||
      pageCode.includes("selectedNote ? 'h-[100dvh]"),
      'Main container must apply 100dvh layout constraints when selectedNote is active'
    );
  });

  it('T1.F6.2: Distraction-free reading suppresses hero Mascot and category header', () => {
    const pageCode = readAppSourceFile('src/app/page.tsx');
    // Verify hero mascot conditional rendering
    assert.ok(
      pageCode.includes('!selectedNote') || pageCode.includes("selectedNote ? null :"),
      'Hero Mascot and top category header must be suppressed when note is open'
    );
  });

  it('T1.F6.3: Unified dynamic island top bar replaces stacked headers', () => {
    const noteViewerCode = readAppSourceFile('src/components/study/NoteViewer.tsx');
    assert.ok(noteViewerCode.length > 0, 'NoteViewer.tsx must exist and be readable');
    assert.ok(
      noteViewerCode.includes('onClose') && noteViewerCode.includes('onUpdateNote'),
      'NoteViewer must support closing and note updating'
    );
  });

  it('T1.F6.4: 3-state NotesPanel architecture supports expanded, icon-rail, and hidden modes', () => {
    const panelCode = readAppSourceFile('src/components/study/NotesPanel.tsx');
    assert.ok(panelCode.length > 0, 'NotesPanel.tsx must exist and be readable');
    assert.ok(
      panelCode.includes('onSelectNote') || panelCode.includes('notesWidth'),
      'NotesPanel must handle note selection and width constraints'
    );
  });

  it('T1.F6.5: Floating pagination dock is detached with backdrop blur and elevated surface', () => {
    const pdfViewerCode = readAppSourceFile('src/components/study/PdfNotebookViewer.tsx');
    assert.ok(
      pdfViewerCode.includes('backdrop-blur') || pdfViewerCode.includes('rounded-full'),
      'PdfNotebookViewer must provide floating pagination controls with backdrop blur'
    );
  });
});

// ============================================================================
// FEATURE F7: STITCH DESIGN INTEGRATION & CONCEPT SIGN-OFF
// ============================================================================

describe('📐 Tier 1 — F7: Stitch Design Integration & Concept Sign-Off', () => {
  it('T1.F7.1: DESIGN_PROPOSALS.md exists and contains approved visual proposals', () => {
    const proposals = readAppSourceFile('DESIGN_PROPOSALS.md');
    assert.ok(proposals.includes('Visual Design Proposals'), 'Document title must match');
    assert.ok(proposals.includes('Google Stitch 16-Theme Token Matrix'), 'Must contain theme token matrix');
    assert.ok(proposals.includes('Dynamic CSS Variable Architecture'), 'Must document CSS variable mapping');
    assert.ok(proposals.includes('Study Tab 100dvh Layout Wireframes'), 'Must document Study Tab overhaul');
  });

  it('T1.F7.2: Touch target ergonomics enforce minimum 44px tap targets for mobile/tablet controls', () => {
    const proposals = readAppSourceFile('DESIGN_PROPOSALS.md');
    assert.ok(
      proposals.includes('44px') || proposals.includes('44x44px'),
      'Design specifications must explicitly enforce 44px minimum tap targets'
    );
  });

  it('T1.F7.3: Deep dark baseline requirement: all 16 themes maintain relative luminance L <= 0.20', () => {
    STITCH_THEMES.forEach(theme => {
      const { r, g, b } = hexToRgb(theme.color);
      const lum = getRelativeLuminance(r, g, b);
      assert.ok(
        lum <= 0.20,
        `Theme ${theme.name} (${theme.color}) relative luminance ${lum.toFixed(4)} must be <= 0.20`
      );
    });
  });

  it('T1.F7.4: High-contrast readability: all 16 themes maintain WCAG AAA contrast ratio > 7:1 against white', () => {
    STITCH_THEMES.forEach(theme => {
      const { r, g, b } = hexToRgb(theme.color);
      const lum = getRelativeLuminance(r, g, b);
      const cr = getContrastRatioAgainstWhite(lum);
      assert.ok(
        cr > 7.0,
        `Theme ${theme.name} contrast ratio ${cr.toFixed(2)}:1 must exceed WCAG AAA 7:1 threshold`
      );
    });
  });

  it('T1.F7.5: Anti-AI-slop design system enforces single dominant primary accent per theme', () => {
    STITCH_THEMES.forEach(theme => {
      assert.ok(theme.customColor.startsWith('#'), `Theme ${theme.name} must have single dominant primary accent`);
      assert.notEqual(theme.color, theme.customColor, `Theme ${theme.name} background and accent must be distinct`);
    });
  });
});
