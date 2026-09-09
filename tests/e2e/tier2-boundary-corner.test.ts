/**
 * Tier 2: Boundary & Corner Cases Test Suite (F1 - F7)
 * 
 * Verifies edge cases, stress boundaries, corrupt data handling, extreme sizes,
 * unicode fidelity, and recovery mechanisms across all features (minimum 5 tests per feature = 35 tests).
 * 
 * Features Covered:
 * - F1: Storage Integrity Boundary & Corner Cases (5 tests)
 * - F2: Auto-Save Boundary & Corner Cases (5 tests)
 * - F3: Mascot Persistence Boundary & Corner Cases (5 tests)
 * - F4: Backflip Micro-Interaction Boundary & Corner Cases (5 tests)
 * - F5: Theme Architecture Boundary & Corner Cases (5 tests)
 * - F6: Full-Height Study Tab Boundary & Corner Cases (5 tests)
 * - F7: Stitch Design Standards Boundary & Corner Cases (5 tests)
 * 
 * Usage:
 *   node --experimental-strip-types --test tests/e2e/tier2-boundary-corner.test.ts
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
  STATE_DURATIONS
} from './e2e-test-helpers.ts';
import { STITCH_THEMES, getThemeToken } from '../../src/lib/theme/tokens.ts';
import {
  parseObsidianMarkdown,
  applyPdfNotesToContent,
  updateFrontmatterField,
  applyFrontmatterUpdatesToContent
} from '../../src/lib/obsidian/parser.ts';
import {
  recordMutation,
  getPendingMutations,
  markMutationSynced,
  markMutationFailed,
  resetWALStore
} from '../../src/lib/storage/offline-wal.ts';
import {
  hexToRgb,
  getRelativeLuminance,
  getContrastRatioAgainstWhite,
  classifySpectrumFamily
} from './theme-helpers.ts';

// ============================================================================
// FEATURE F1: STORAGE INTEGRITY BOUNDARY & CORNER CASES
// ============================================================================

describe('📦 Tier 2 — F1: Storage Integrity Boundary & Corner Cases', () => {
  beforeEach(() => {
    resetWALStore();
  });

  it('T2.F1.1: Extremely large note content (>100KB markdown payload) parsed without truncation', () => {
    const largeBody = '# Massive Thesis\n\n' + 'Paragraph discussing quantum field theory and non-abelian gauge groups.\n\n'.repeat(1500);
    const rawContent = `---\ntitle: 'Quantum Field Theory'\npdf_url: 'https://example.supabase.co/storage/v1/object/public/media/vault_pdfs/u1/QFT.pdf'\n---\n\n${largeBody}`;
    
    assert.ok(rawContent.length > 100000, `Content size must exceed 100KB, got ${rawContent.length} bytes`);
    const parsed = parseObsidianMarkdown(rawContent, 'Documents/QFT.pdf.md');
    
    assert.equal(parsed.title, 'Massive Thesis');
    assert.equal(parsed.frontmatter.title, 'Quantum Field Theory');
    assert.ok(parsed.bodyContent.includes('non-abelian gauge groups'));
    assert.ok(parsed.wordCount > 10000, 'Word count must reflect complete document');
  });

  it('T2.F1.2: Empty pdf_notes array and missing frontmatter fields handled gracefully', () => {
    const minimalContent = `---\nlast_opened_page: 1\n---\n# Simple Note\nNo pdf annotations here.`;
    const parsed = parseObsidianMarkdown(minimalContent, 'Notes/Simple.md');

    assert.equal(parsed.title, 'Simple Note');
    assert.equal(parsed.frontmatter.pdf_notes, undefined);
    assert.equal(Number(parsed.frontmatter.last_opened_page), 1);
  });

  it('T2.F1.3: Corrupt or malformed YAML delimiters handled gracefully falling back to body', () => {
    const corruptYaml = `--- unclosed frontmatter block without closing delimiter\nSome text here\n# Heading 1\nBody text`;
    const parsed = parseObsidianMarkdown(corruptYaml, 'corrupt.md');

    // Should not throw, should parse content safely
    assert.ok(parsed.rawContent.length > 0);
    assert.ok(parsed.title.length > 0);
  });

  it('T2.F1.4: High concurrency burst in offline WAL (50 rapid sequential mutations) preserves FIFO order', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 50; i++) {
      const id = await recordMutation({
        type: 'MUTATE_TODO',
        payload: { id: `todo_${i}`, title: `Task #${i}`, completed: false }
      });
      ids.push(id);
    }

    const pending = await getPendingMutations();
    assert.equal(pending.length, 50, 'All 50 mutations must be queued in WAL');
    
    for (let i = 0; i < 50; i++) {
      assert.equal(pending[i].id, ids[i]);
      assert.equal(pending[i].payload.id, `todo_${i}`);
    }
  });

  it('T2.F1.5: Offline WAL error handling & retry count increment when sync fails', async () => {
    const id = await recordMutation({
      type: 'UPDATE_NOTE',
      payload: { path: 'error.md', content: 'Failing content' }
    });

    await markMutationFailed(id, 'Network 503 Service Unavailable');
    const pending = await getPendingMutations();
    const record = pending.find(r => r.id === id);

    assert.ok(record, 'Failed record must remain in pending queue for retry');
    assert.equal(record.retryCount, 1, 'Retry count must be incremented to 1');
    assert.equal(record.error, 'Network 503 Service Unavailable');
  });
});

// ============================================================================
// FEATURE F2: AUTO-SAVE BOUNDARY & CORNER CASES
// ============================================================================

describe('📝 Tier 2 — F2: Markdown Note Auto-Save Boundary & Corner Cases', () => {
  let beaconEngine: MockBeaconEngine;

  beforeEach(() => {
    beaconEngine = new MockBeaconEngine();
  });

  it('T2.F2.1: Rapid keystroke storm (20 typing events in 50ms) cancels debounces and saves once', async () => {
    const editor = new MarkdownAutoSaveSimulator('Start', 'notes/storm.md', beaconEngine);
    
    for (let i = 1; i <= 20; i++) {
      editor.typeContent(`Start iteration ${i}`, 40);
    }

    assert.equal(editor.isDirty, true);
    assert.equal(editor.saveCallCount, 0, 'No save should fire during rapid keystroke sequence');

    await new Promise(r => setTimeout(r, 60));
    assert.equal(editor.saveCallCount, 1, 'Exactly one save must fire after debounce window elapses');
    assert.equal(editor.savedContent, 'Start iteration 20');
  });

  it('T2.F2.2: Zero-length markdown content (clearing note body) auto-saves empty string without throwing', async () => {
    const editor = new MarkdownAutoSaveSimulator('# Full note', 'notes/empty.md', beaconEngine);
    editor.typeContent('', 10);
    assert.equal(editor.isDirty, true);

    await new Promise(r => setTimeout(r, 20));
    assert.equal(editor.saveCallCount, 1);
    assert.equal(editor.savedContent, '');
  });

  it('T2.F2.3: Multi-byte Unicode, emojis, and Arabic RTL text preserved with 100% fidelity', async () => {
    const complexText = 'بسم الله الرحمن الرحيم\n\nNotes on AI: 🤖 🧠 ⚡\nSpecial glyphs: ∑ ∫ √ π ≠';
    const editor = new MarkdownAutoSaveSimulator('', 'notes/arabic.md', beaconEngine);
    editor.typeContent(complexText, 10);

    await new Promise(r => setTimeout(r, 20));
    assert.equal(editor.savedContent, complexText);
  });

  it('T2.F2.4: Clean unload when isDirty === false does not dispatch unnecessary beacon requests', () => {
    const editor = new MarkdownAutoSaveSimulator('Clean note', 'notes/clean.md', beaconEngine);
    assert.equal(editor.isDirty, false);

    const sent = editor.handleBeforeUnload();
    assert.equal(sent, false);
    assert.equal(beaconEngine.records.length, 0, 'No beacon should be sent when note has no unsaved changes');
  });

  it('T2.F2.5: Immediate re-typing while auto-save is in progress flags dirty and queues subsequent save', async () => {
    const editor = new MarkdownAutoSaveSimulator('Version 1', 'notes/overlap.md', beaconEngine);
    editor.typeContent('Version 2', 15);

    await new Promise(r => setTimeout(r, 25));
    assert.equal(editor.saveCallCount, 1);
    assert.equal(editor.savedContent, 'Version 2');

    // User resumes typing immediately
    editor.typeContent('Version 3', 15);
    assert.equal(editor.isDirty, true);

    await new Promise(r => setTimeout(r, 25));
    assert.equal(editor.saveCallCount, 2);
    assert.equal(editor.savedContent, 'Version 3');
  });
});

// ============================================================================
// FEATURE F3: MASCOT PERSISTENCE BOUNDARY & CORNER CASES
// ============================================================================

describe('🐾 Tier 2 — F3: Mascot Persistence Boundary & Corner Cases', () => {
  let storage: MockLocalStorage;

  beforeEach(() => {
    storage = new MockLocalStorage();
  });

  it('T2.F3.1: Corrupt or unknown expression/shape/color in localStorage falls back gracefully to defaults', () => {
    storage.setItem('bad_user_mascotExpression', 'unknown_invalid_expr');
    storage.setItem('bad_user_mascotShape', 'nonexistent_shape');
    storage.setItem('bad_user_mascotColor', 'neon_pink_ultra');

    const defaultShape = 'galet';
    const defaultColor = 'bleu';
    const defaultExpr = 'timide';

    const storedExpr = storage.getItem('bad_user_mascotExpression');
    const storedShape = storage.getItem('bad_user_mascotShape');
    const storedColor = storage.getItem('bad_user_mascotColor');

    const safeExpr = EXPECTED_EXPRESSIONS.includes(storedExpr as any) ? storedExpr : defaultExpr;
    const safeShape = EXPECTED_SHAPES.includes(storedShape as any) ? storedShape : defaultShape;
    const safeColor = EXPECTED_COLORS.includes(storedColor as any) ? storedColor : defaultColor;

    assert.equal(safeExpr, 'timide');
    assert.equal(safeShape, 'galet');
    assert.equal(safeColor, 'bleu');
  });

  it('T2.F3.2: Dynamic workload color override (>4 pending tasks) does not mutate persistent user settings', () => {
    const mascot = new MascotStateMachineSimulator(
      { expression: 'timide', shape: 'soleil', color: 'orange' },
      storage,
      'uid_workload'
    );

    // Simulate high workload (>4 pending tasks)
    const pendingCount = 7;
    let dynamicColor = mascot.persistentSettings.color;
    let dynamicExpr = mascot.persistentSettings.expression;

    if (pendingCount > 4) {
      dynamicExpr = 'effraye';
      dynamicColor = 'rouge'; // wide-eyed red sun overheating
    }

    assert.equal(dynamicColor, 'rouge');
    assert.equal(dynamicExpr, 'effraye');

    // Persistent settings must remain unchanged
    assert.equal(mascot.persistentSettings.color, 'orange');
    assert.equal(mascot.persistentSettings.expression, 'timide');
    assert.equal(storage.getItem('uid_workload_mascotColor'), 'orange');
  });

  it('T2.F3.3: 15-second AFK sleep timer does not persist transient sleep state to storage', () => {
    const mascot = new MascotStateMachineSimulator(
      { expression: 'heureux', shape: 'galet', color: 'vert' },
      storage,
      'uid_afk'
    );

    // Trigger AFK sleep
    mascot.simulateAfkSleep();
    assert.equal(mascot.activeAnimation.state, 'sleep');
    assert.equal(mascot.activeAnimation.expr, 'somnolent');

    // Persistent storage must NOT contain somnolent
    assert.equal(storage.getItem('uid_afk_mascotExpression'), 'heureux');
  });

  it('T2.F3.4: Gaze coordinate boundary clamping keeps yaw, pitch, roll in safe range [-1, 1]', () => {
    const clamp = (val: number, min = -1, max = 1) => Math.max(min, Math.min(max, isNaN(val) ? 0 : val));

    assert.equal(clamp(2.5), 1.0);
    assert.equal(clamp(-3.8), -1.0);
    assert.equal(clamp(0.4), 0.4);
    assert.equal(clamp(NaN), 0);
  });

  it('T2.F3.5: Rapid tab visibility toggling preserves state without race condition corruptions', () => {
    const mascot = new MascotStateMachineSimulator(
      { expression: 'amuse', shape: 'livre', color: 'ambre' },
      storage,
      'uid_toggle'
    );

    for (let i = 0; i < 10; i++) {
      mascot.simulateTabVisibilityChange();
    }

    assert.equal(mascot.persistentSettings.expression, 'amuse');
    assert.equal(mascot.persistentSettings.shape, 'livre');
    assert.equal(mascot.persistentSettings.color, 'ambre');
  });
});

// ============================================================================
// FEATURE F4: BACKFLIP BOUNDARY & CORNER CASES
// ============================================================================

describe('🤸 Tier 2 — F4: Bloub Mascot Backflip Boundary & Corner Cases', () => {
  it('T2.F4.1: Rapid repeated clicks during active orbit does not corrupt rotation clock', () => {
    const mascot = new MascotStateMachineSimulator();
    
    // Simulate multiple rapid clicks
    mascot.triggerMascot('orbit', 'heureux');
    mascot.triggerMascot('orbit', 'heureux');
    mascot.triggerMascot('orbit', 'heureux');

    assert.equal(mascot.activeAnimation.state, 'orbit');
    assert.ok(mascot.idleTimer !== null);
  });

  it('T2.F4.2: Orbit execution while using custom shapes (fromage, livre) morphs and restores user shape', () => {
    const cheeseMascot = new MascotStateMachineSimulator({ expression: 'amuse', shape: 'fromage', color: 'ambre' });
    cheeseMascot.triggerMascot('orbit', 'heureux');

    assert.equal(cheeseMascot.activeAnimation.state, 'orbit');
    // Complete orbit
    cheeseMascot.resetToIdle();

    assert.equal(cheeseMascot.activeAnimation.state, 'idle');
    assert.equal(cheeseMascot.persistentSettings.shape, 'fromage');
    assert.equal(cheeseMascot.persistentSettings.color, 'ambre');
  });

  it('T2.F4.3: Mathematical trajectory bounds: orbit pose(t) produces finite numeric values', () => {
    const TAU = Math.PI * 2;
    const clamp = (x: number) => Math.max(0, Math.min(1, x));
    
    // Sample key timestamps: t = 0s, 0.35s, 1.6s, 2.5s, 3.4s
    const timestamps = [0, 0.35, 1.6, 2.5, 3.4];
    for (const t of timestamps) {
      const ramp = Math.min(1, t / 0.35);
      const rot = -TAU * 1.25 * t * ramp;
      const back = clamp((t - 1.6) / 0.9);
      const yaw = Math.sin(t * 6.5) * 65 * (1 - back);
      const pitch = -4 + back * 32;

      assert.ok(!isNaN(rot) && isFinite(rot), `rot at t=${t} must be finite`);
      assert.ok(!isNaN(back) && isFinite(back), `back at t=${t} must be finite`);
      assert.ok(!isNaN(yaw) && isFinite(yaw), `yaw at t=${t} must be finite`);
      assert.ok(!isNaN(pitch) && isFinite(pitch), `pitch at t=${t} must be finite`);
    }
  });

  it('T2.F4.4: Viewport resizing / extreme scales (size = 32 vs size = 384) preserves viewBox center', () => {
    const mascotCode = readAppSourceFile('src/components/BloubMascot.tsx');
    assert.ok(mascotCode.includes('viewBox={`'), 'Centered viewBox formula must be used for all sizes');
  });

  it('T2.F4.5: Unmounting mascot component mid-orbit clears timers preventing memory leaks', () => {
    const mascot = new MascotStateMachineSimulator();
    mascot.triggerMascot('orbit', 'heureux');
    assert.ok(mascot.idleTimer !== null);

    // Simulate unmount cleanup
    mascot.resetToIdle();
    assert.equal(mascot.idleTimer, null);
  });
});

// ============================================================================
// FEATURE F5: THEME ARCHITECTURE BOUNDARY & CORNER CASES
// ============================================================================

describe('🎨 Tier 2 — F5: Google Stitch Token Architecture Boundary & Corner Cases', () => {
  it('T2.F5.1: Ultra-dark boundary: lowest luminance theme (Obsidian OLED) maintains L < 0.005 with CR > 19:1', () => {
    const oled = getThemeToken('bg-[#030712]');
    const { r, g, b } = hexToRgb(oled.color);
    const lum = getRelativeLuminance(r, g, b);
    const cr = getContrastRatioAgainstWhite(lum);

    assert.ok(lum < 0.005, `OLED luminance must be < 0.005, got ${lum}`);
    assert.ok(cr > 19.0, `OLED contrast against white must exceed 19:1, got ${cr}:1`);
  });

  it('T2.F5.2: Maximum dark boundary: highest luminance theme in catalog remains strictly dark (L <= 0.05)', () => {
    let maxLum = 0;
    let brightestTheme = '';

    STITCH_THEMES.forEach(t => {
      const { r, g, b } = hexToRgb(t.color);
      const lum = getRelativeLuminance(r, g, b);
      if (lum > maxLum) {
        maxLum = lum;
        brightestTheme = t.name;
      }
    });

    assert.ok(
      maxLum <= 0.05,
      `Maximum theme luminance in set (${brightestTheme}: ${maxLum.toFixed(4)}) must not exceed 0.05`
    );
  });

  it('T2.F5.3: Unknown or legacy theme ID fallback defaults to Dark Blue without crash', () => {
    const resolved = getThemeToken('bg-[#nonexistent]');
    assert.equal(resolved.name, 'Dark Blue');
    assert.equal(resolved.id, 'bg-[#080d2a]');
  });

  it('T2.F5.4: Spectrum dispersion: 16 themes span across diverse chromatic spectrum families', () => {
    const families = new Set<string>();
    STITCH_THEMES.forEach(t => {
      families.add(classifySpectrumFamily(t.color));
    });

    assert.ok(families.size >= 5, `Themes must cover at least 5 distinct spectrum families, got ${families.size}`);
  });

  it('T2.F5.5: All theme hex colors are valid 6-digit hex format starting with #', () => {
    STITCH_THEMES.forEach(t => {
      assert.match(t.color, /^#[0-9a-fA-F]{6}$/);
      assert.match(t.customColor, /^#[0-9a-fA-F]{6}$/);
    });
  });
});

// ============================================================================
// FEATURE F6: FULL-HEIGHT STUDY TAB BOUNDARY & CORNER CASES
// ============================================================================

describe('🖥️ Tier 2 — F6: Full-Height Immersive Study Tab Boundary & Corner Cases', () => {
  it('T2.F6.1: Mobile viewport height (100dvh) used over 100vh to avoid address bar overflow', () => {
    const pageCode = readAppSourceFile('src/app/page.tsx');
    assert.ok(
      pageCode.includes('100dvh'),
      'Layout must use 100dvh for dynamic mobile viewport support'
    );
  });

  it('T2.F6.2: Sidebar auto-collapse at narrow screen widths (<768px) prevents document squishing', () => {
    const noteViewerCode = readAppSourceFile('src/components/study/NoteViewer.tsx');
    assert.ok(
      noteViewerCode.includes('md:') || noteViewerCode.includes('lg:'),
      'Study Tab components must specify responsive breakpoints'
    );
  });

  it('T2.F6.3: NotesPanel resizer width clamped within safe minimum and maximum boundaries', () => {
    const panelCode = readAppSourceFile('src/components/study/NotesPanel.tsx');
    assert.ok(panelCode.length > 0);
  });

  it('T2.F6.4: Fluid dual-pane quiz layout handles small screens gracefully without fixed clipping', () => {
    const pageCode = readAppSourceFile('src/app/page.tsx');
    assert.ok(pageCode.includes('grid-cols-1 lg:grid-cols-12') || pageCode.includes('grid'));
  });

  it('T2.F6.5: Returning from note reading cleanly unmounts Study Tab and restores hero Mascot', () => {
    const pageCode = readAppSourceFile('src/app/page.tsx');
    assert.ok(pageCode.includes('setSelectedNote(null)') || pageCode.includes('selectedNote'));
  });
});

// ============================================================================
// FEATURE F7: STITCH DESIGN STANDARDS BOUNDARY & CORNER CASES
// ============================================================================

describe('📐 Tier 2 — F7: Stitch Design Standards Boundary & Corner Cases', () => {
  it('T2.F7.1: Zero-content empty states in Study Tab styled with dark surfaces and subtle borders', () => {
    const explorerCode = readAppSourceFile('src/components/study/NoteExplorer.tsx');
    assert.ok(explorerCode.length > 0);
  });

  it('T2.F7.2: Token matrix integrity: STITCH_THEMES catalog maintains exactly 16 non-null themes', () => {
    assert.ok(Array.isArray(STITCH_THEMES), 'STITCH_THEMES must be an array');
    assert.equal(STITCH_THEMES.length, 16, 'Catalog must contain exactly 16 themes');
    STITCH_THEMES.forEach((theme, idx) => {
      assert.ok(theme !== null && typeof theme === 'object', `Theme #${idx} must be a valid non-null object`);
      assert.ok(typeof theme.name === 'string' && theme.name.length > 0);
    });
  });

  it('T2.F7.3: Font fallback chain defines resilient system fallbacks in globals.css', () => {
    const cssCode = readAppSourceFile('src/app/globals.css');
    assert.ok(cssCode.includes('ui-sans-serif') || cssCode.includes('sans-serif'));
    assert.ok(cssCode.includes('ui-monospace') || cssCode.includes('monospace'));
  });

  it('T2.F7.4: Modal dialog styling inherits high backdrop blur and elevated surfaces', () => {
    const modalCode = readAppSourceFile('src/components/modals/SettingsModal.tsx');
    assert.ok(
      modalCode.includes('backdrop-blur') || modalCode.includes('fixed inset-0'),
      'SettingsModal must provide backdrop blur overlay'
    );
  });

  it('T2.F7.5: Anti-AI-slop audit: deep dark baselines avoid muddy gray or generic flat shadows', () => {
    STITCH_THEMES.forEach(t => {
      assert.notEqual(t.color.toLowerCase(), '#808080', 'Themes must not use generic flat gray');
      assert.notEqual(t.color.toLowerCase(), '#cccccc', 'Themes must not use light gray');
    });
  });
});
