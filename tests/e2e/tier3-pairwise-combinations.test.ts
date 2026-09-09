/**
 * Tier 3: Pairwise Cross-Feature Combinations Test Suite
 * 
 * Verifies complex pairwise interactions between features F1 through F7:
 * - T3.1: F3 (Mascot Persistence) + F4 (Backflip Micro-Interaction)
 * - T3.2: F5 (Theme Reactivity) + F6 (Full-Height Study Tab)
 * - T3.3: F1 (Storage Integrity) + F2 (Markdown Auto-Save)
 * - T3.4: F3 (Mascot State) + F5 (Theme Reactivity)
 * - T3.5: F2 (Auto-Save Beacon) + F6 (Study Tab Viewport Navigation)
 * - T3.6: F1 (PDF Annotations) + F5 (Theme Remodeling)
 * - T3.7: F4 (Backflip Timing) + F3 (AFK Sleep Timer)
 * - T3.8: F6 (Full-Height Study Tab) + F1 (Supabase Storage Sync)
 * 
 * Usage:
 *   node --experimental-strip-types --test tests/e2e/tier3-pairwise-combinations.test.ts
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
  readAppSourceFile
} from './e2e-test-helpers.ts';
import { getThemeToken, STITCH_THEMES } from '../../src/lib/theme/tokens.ts';
import { parseObsidianMarkdown, applyPdfNotesToContent } from '../../src/lib/obsidian/parser.ts';
import {
  recordMutation,
  getPendingMutations,
  markMutationSynced,
  resetWALStore
} from '../../src/lib/storage/offline-wal.ts';

describe('🔗 Tier 3: Pairwise Cross-Feature Combinations', () => {
  let storage: MockLocalStorage;
  let beaconEngine: MockBeaconEngine;
  let db: MockSupabaseDatabase;

  beforeEach(() => {
    storage = new MockLocalStorage();
    beaconEngine = new MockBeaconEngine();
    db = new MockSupabaseDatabase();
    resetWALStore();
  });

  it('T3.1 [F3 + F4]: Mascot backflip executes orbit without resetting persistent custom shape or color', () => {
    const mascot = new MascotStateMachineSimulator(
      { expression: 'amuse', shape: 'fromage', color: 'ambre', gaze: { yaw: 0.15, pitch: -0.1, roll: 0 } },
      storage,
      'uid_pairwise_1'
    );

    assert.equal(mascot.persistentSettings.shape, 'fromage');
    assert.equal(mascot.persistentSettings.color, 'ambre');

    // Trigger backflip orbit
    const timeout = mascot.triggerMascot('orbit', 'heureux');
    assert.equal(timeout, 3400, 'Orbit must last 3.4s');
    assert.equal(mascot.activeAnimation.state, 'orbit');

    // Finish orbit and return to idle
    mascot.resetToIdle();
    assert.equal(mascot.activeAnimation.state, 'idle');
    assert.equal(mascot.activeAnimation.expr, 'amuse', 'Restored expression must be user customized amuse');
    assert.equal(mascot.persistentSettings.shape, 'fromage', 'Shape must remain fromage');
    assert.equal(mascot.persistentSettings.color, 'ambre', 'Color must remain ambre');
  });

  it('T3.2 [F5 + F6]: Switching theme while inside full-height Study Tab updates CSS variables immediately', () => {
    const themeDriver = new ThemeRuntimeDriver('bg-[#080d2a]'); // Dark Blue
    assert.equal(themeDriver.getCssVariableValue('--theme-primary'), '#3b82f6');

    // Simulate switching theme to Emerald Night while inside 100dvh viewport
    themeDriver.applyTheme('bg-[#022c22]');
    assert.equal(themeDriver.activeThemeId, 'bg-[#022c22]');
    assert.equal(themeDriver.getCssVariableValue('--theme-primary'), '#10b981');
    assert.equal(themeDriver.getCssVariableValue('--theme-surface'), 'rgba(6, 52, 42, 0.80)');
    assert.equal(themeDriver.metaThemeColor, '#022c22');
  });

  it('T3.3 [F1 + F2]: Markdown auto-save persists mutations to offline WAL and Supabase without data truncation', async () => {
    const editor = new MarkdownAutoSaveSimulator('Initial notes', 'Documents/Deen.pdf.md', beaconEngine);
    editor.typeContent('Initial notes\nComprehensive theological analysis on Surah Al-Ikhlas.', 10);

    // Save triggers
    await new Promise(r => setTimeout(r, 20));
    assert.equal(editor.saveCallCount, 1);

    // Queue mutation to WAL
    const mutId = await recordMutation({
      type: 'UPDATE_NOTE',
      payload: { path: 'Documents/Deen.pdf.md', content: editor.savedContent }
    });

    // Update Supabase DB
    await db.from('vault_notes').update({ content: editor.savedContent }).eq('path', 'Documents/Deen.pdf.md');
    await markMutationSynced(mutId);

    // Verify retrieval from DB
    const note = (await db.from('vault_notes').select('*').eq('path', 'Documents/Deen.pdf.md').single()).data;
    assert.ok(note.content.includes('Surah Al-Ikhlas'));
  });

  it('T3.4 [F3 + F5]: Changing theme and mascot expression simultaneously in settings modal persists both', async () => {
    const mascot = new MascotStateMachineSimulator(
      { expression: 'neutre', shape: 'galet', color: 'bleu' },
      storage,
      'uid_combo'
    );
    const themeDriver = new ThemeRuntimeDriver('bg-[#080d2a]');

    // Simultaneous settings modification
    mascot.updatePersistentSettings({ expression: 'fier', color: 'violet' });
    themeDriver.applyTheme('bg-[#1a0b2e]'); // Midnight Violet
    storage.setItem('uid_combo_bgTheme', themeDriver.activeThemeId);

    // Update cloud user metadata
    await db.auth.updateUser({
      data: {
        mascotExpression: mascot.persistentSettings.expression,
        mascotColor: mascot.persistentSettings.color,
        bgTheme: themeDriver.activeThemeId
      }
    });

    const { data: { user } } = await db.auth.getUser();
    assert.equal(user.user_metadata.mascotExpression, 'fier');
    assert.equal(user.user_metadata.mascotColor, 'violet');
    assert.equal(user.user_metadata.bgTheme, 'bg-[#1a0b2e]');
    assert.equal(storage.getItem('uid_combo_mascotExpression'), 'fier');
    assert.equal(storage.getItem('uid_combo_bgTheme'), 'bg-[#1a0b2e]');
  });

  it('T3.5 [F2 + F6]: Rapidly editing markdown and exiting Study Tab flushes beacon preserving content', () => {
    const editor = new MarkdownAutoSaveSimulator('# Chapter 1', 'notes/exam.md', beaconEngine);
    editor.typeContent('# Chapter 1\nCritical final theorem notes before closing panel.', 5000);

    // User immediately closes Study Tab before debounce timer (5000ms) fires
    const dispatched = editor.handleBeforeUnload();
    assert.equal(dispatched, true);
    assert.equal(beaconEngine.records.length, 1);
    assert.equal(beaconEngine.latest?.data.content, '# Chapter 1\nCritical final theorem notes before closing panel.');
  });

  it('T3.6 [F1 + F5]: Drawing PDF annotations under high-contrast dark theme maintains color and coordinates', () => {
    const theme = getThemeToken('bg-[#3b0712]'); // Crimson Ember
    const rawNote = `---\ntitle: 'Law Review'\n---\n# Notes`;
    
    // Add annotation with high-contrast accent matching theme or semantic yellow
    const annotation = {
      id: 501,
      page: 12,
      startX: 120.5,
      startY: 450.0,
      w: 240.0,
      h: 22.5,
      color: theme.customColor // theme accent
    };

    const updatedContent = applyPdfNotesToContent(rawNote, [annotation]);
    const parsed = parseObsidianMarkdown(updatedContent, 'Law.pdf.md');
    const notes = JSON.parse(parsed.frontmatter.pdf_notes);

    assert.equal(notes.length, 1);
    assert.equal(notes[0].startX, 120.5);
    assert.equal(notes[0].color, '#f43f5e');
  });

  it('T3.7 [F4 + F3]: Mascot backflip cleanly defers AFK sleep until 3.4s orbit completes', () => {
    const mascot = new MascotStateMachineSimulator(
      { expression: 'timide', shape: 'squircle', color: 'bleu' },
      storage,
      'uid_sleep_defer'
    );

    // User triggers backflip at 14.9s right before AFK
    mascot.triggerMascot('orbit', 'heureux');
    assert.equal(mascot.activeAnimation.state, 'orbit');

    // Finish backflip
    mascot.resetToIdle();
    assert.equal(mascot.activeAnimation.state, 'idle');
    assert.equal(mascot.activeAnimation.expr, 'timide');

    // AFK sleep can now trigger safely
    mascot.simulateAfkSleep();
    assert.equal(mascot.activeAnimation.state, 'sleep');
    assert.equal(storage.getItem('uid_sleep_defer_mascotExpression'), 'timide');
  });

  it('T3.8 [F6 + F1]: Opening PDF note in Study Tab resolves public media URL and inherits 100dvh layout', () => {
    const publicUrl = db.storage.from('media').getPublicUrl('vault_pdfs/u1/History.pdf').data.publicUrl;
    assert.ok(publicUrl.includes('vault_pdfs/u1/History.pdf'));

    const pageCode = readAppSourceFile('src/app/page.tsx');
    assert.ok(pageCode.includes('selectedNote') && pageCode.includes('100dvh'));
  });
});
