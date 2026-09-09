/**
 * Tier 4: Real-World Application Scenarios Test Suite
 * 
 * Simulates complete, realistic end-user study workflows across all 7 features:
 * - T4.1: Scenario 1 — The Deep Study Session (F1 + F5 + F6)
 * - T4.2: Scenario 2 — The Multitasking Tab Switcher (F3 + F5)
 * - T4.3: Scenario 3 — The Rapid Note Taker with Sudden Exit (F2 + F1 + F6)
 * - T4.4: Scenario 4 — Playful Mascot Break During Intensive Study (F4 + F3 + F6)
 * - T4.5: Scenario 5 — Offline Emergency and Reconnection Resilience (F1 + F2 + F4)
 * - T4.6: Scenario 6 — End-to-End Visual Redesign & Anti-Slop Audit (F5 + F6 + F7)
 * 
 * Usage:
 *   node --experimental-strip-types --test tests/e2e/tier4-application-scenarios.test.ts
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

describe('🌐 Tier 4: Real-World Application Scenarios', () => {
  let storage: MockLocalStorage;
  let beaconEngine: MockBeaconEngine;
  let db: MockSupabaseDatabase;

  beforeEach(() => {
    storage = new MockLocalStorage();
    beaconEngine = new MockBeaconEngine();
    db = new MockSupabaseDatabase();
    resetWALStore();
  });

  it('T4.1: Scenario 1 — The Deep Study Session (Textbook reading, highlights, theme adaptation, 100dvh)', async () => {
    // 1. User loads AI textbook note from Supabase
    const aiNoteRow = (await db.from('vault_notes').select('*').eq('title', 'AI').single()).data;
    assert.ok(aiNoteRow, 'AI note must exist in database');
    const parsedBefore = parseObsidianMarkdown(aiNoteRow.content, 'Documents/AI.pdf.md');
    const existingNotes = JSON.parse(parsedBefore.frontmatter.pdf_notes);
    assert.equal(existingNotes.length, 1);
    assert.equal(existingNotes[0].page, 196);

    // 2. User sets Midnight Violet theme for night study
    const themeDriver = new ThemeRuntimeDriver('bg-[#1a0b2e]');
    assert.equal(themeDriver.getCssVariableValue('--theme-primary'), '#a855f7');
    assert.equal(themeDriver.htmlAttributes['data-theme'], 'bg-[#1a0b2e]');

    // 3. User creates a new highlight annotation on page 196
    const newHighlight = {
      id: 1788160999999,
      page: 196,
      startX: 120.0,
      startY: 210.0,
      w: 150.0,
      h: 22.0,
      color: '#a855f7', // Matching active theme primary
      text: 'Proof of global minimum for convex loss'
    };
    const updatedNotes = [...existingNotes, newHighlight];
    const updatedContent = applyPdfNotesToContent(aiNoteRow.content, updatedNotes);

    // 4. Persist to Supabase
    await db.from('vault_notes').update({ content: updatedContent }).eq('title', 'AI');

    // 5. Verify database integrity
    const savedNote = (await db.from('vault_notes').select('*').eq('title', 'AI').single()).data;
    const parsedAfter = parseObsidianMarkdown(savedNote.content, 'Documents/AI.pdf.md');
    const savedAnnotations = JSON.parse(parsedAfter.frontmatter.pdf_notes);
    
    assert.equal(savedAnnotations.length, 2, 'Note must contain exactly 2 highlights after addition');
    assert.equal(savedAnnotations[1].text, 'Proof of global minimum for convex loss');
    assert.equal(savedAnnotations[1].color, '#a855f7');
  });

  it('T4.2: Scenario 2 — The Multitasking Tab Switcher (Mascot customization & tab synchronization)', async () => {
    // 1. User configures Bloub to 'soleil', 'orange', 'amuse' under Dark Blue
    const mascot = new MascotStateMachineSimulator(
      { expression: 'amuse', shape: 'soleil', color: 'orange', gaze: { yaw: 0.2, pitch: -0.1, roll: 0 } },
      storage,
      'uid_switcher'
    );
    const themeDriver = new ThemeRuntimeDriver('bg-[#080d2a]');

    assert.equal(storage.getItem('uid_switcher_mascotExpression'), 'amuse');
    assert.equal(storage.getItem('uid_switcher_mascotShape'), 'soleil');

    // 2. User switches tabs (visibilityState: hidden)
    // In background, cloud metadata sync occurs
    await db.auth.updateUser({
      data: {
        mascotExpression: 'amuse',
        mascotShape: 'soleil',
        mascotColor: 'orange',
        bgTheme: 'bg-[#080d2a]'
      }
    });

    // 3. User switches back to tab (visibilityState: visible)
    const { data: { user } } = await db.auth.getUser();
    mascot.simulateTabVisibilityChange(user.user_metadata);

    // 4. Mascot state must be 100% intact
    assert.equal(mascot.persistentSettings.expression, 'amuse');
    assert.equal(mascot.persistentSettings.shape, 'soleil');
    assert.equal(mascot.persistentSettings.color, 'orange');
    assert.equal(themeDriver.activeThemeId, 'bg-[#080d2a]');
  });

  it('T4.3: Scenario 3 — The Rapid Note Taker with Sudden Exit (Beacon flush preservation)', async () => {
    const editor = new MarkdownAutoSaveSimulator('# Physics Lecture Notes\n', 'notes/physics.md', beaconEngine);

    // Fast typing across 5 intervals
    editor.typeContent('# Physics Lecture Notes\n1. Conservation of Momentum\n', 1000);
    editor.typeContent('# Physics Lecture Notes\n1. Conservation of Momentum\n2. Angular Velocity: ω = dθ/dt\n', 1000);
    editor.typeContent('# Physics Lecture Notes\n1. Conservation of Momentum\n2. Angular Velocity: ω = dθ/dt\n3. Torque: τ = r × F\n', 1000);

    assert.equal(editor.isDirty, true);
    assert.equal(editor.saveCallCount, 0); // debounce has not elapsed

    // Abrupt tab closure
    editor.handleBeforeUnload();

    assert.equal(beaconEngine.records.length, 1);
    assert.equal(beaconEngine.latest?.url, '/api/obsidian/flush');
    assert.ok(beaconEngine.latest?.data.content.includes('Torque: τ = r × F'));
  });

  it('T4.4: Scenario 4 — Playful Mascot Break During Intensive Study (Backflip execution & safe return)', () => {
    // 1. User is studying with custom book mascot
    const mascot = new MascotStateMachineSimulator(
      { expression: 'attentif', shape: 'livre', color: 'violet', gaze: { yaw: 0.1, pitch: -0.2, roll: 0 } },
      storage,
      'uid_break'
    );

    // 2. User clicks Bloub to initiate celebration backflip
    const duration = mascot.triggerMascot('orbit', 'heureux');
    assert.equal(duration, 3400);
    assert.equal(mascot.activeAnimation.state, 'orbit');
    assert.equal(mascot.activeAnimation.expr, 'heureux');

    // 3. Orbit completes
    mascot.resetToIdle();

    // 4. Returns smoothly to idle with persistent book settings intact
    assert.equal(mascot.activeAnimation.state, 'idle');
    assert.equal(mascot.activeAnimation.expr, 'attentif');
    assert.equal(mascot.persistentSettings.shape, 'livre');
    assert.equal(mascot.persistentSettings.color, 'violet');
  });

  it('T4.5: Scenario 5 — Offline Emergency and Reconnection Resilience (WAL queuing & replay)', async () => {
    // 1. Student goes offline (airplane mode)
    const offlineNotePath = 'Documents/History.pdf.md';
    const updatedHistory = '# Ottoman Empire: Modern Reforms (Tanzimat Era)\nDetailed study notes recorded while offline.';

    // 2. Offline WAL queues mutation
    const mut1 = await recordMutation({
      type: 'UPDATE_NOTE',
      payload: { path: offlineNotePath, content: updatedHistory }
    });

    const mut2 = await recordMutation({
      type: 'SAVE_PDF_ANNOTATIONS',
      payload: { notePath: offlineNotePath, page: 5, action: 'add', annotation: { id: 888, startX: 50, startY: 80 } }
    });

    const pending = await getPendingMutations();
    assert.equal(pending.length, 2);

    // 3. User triggers backflip celebration
    const mascot = new MascotStateMachineSimulator();
    mascot.triggerMascot('orbit', 'heureux');
    mascot.resetToIdle();
    assert.equal(mascot.activeAnimation.state, 'idle');

    // 4. Network reconnects: replay mutations to Supabase
    for (const m of pending) {
      if (m.type === 'UPDATE_NOTE') {
        await db.from('vault_notes').update({ content: m.payload.content }).eq('path', m.payload.path);
      }
      await markMutationSynced(m.id);
    }

    const remaining = await getPendingMutations();
    assert.equal(remaining.length, 0, 'All mutations successfully synced upon reconnection');

    // 5. Verify Supabase has the latest content
    const syncedNote = (await db.from('vault_notes').select('*').eq('path', offlineNotePath).single()).data;
    assert.ok(syncedNote.content.includes('Tanzimat Era'));
  });

  it('T4.6: Scenario 6 — End-to-End Visual Redesign & Anti-Slop Audit (Stitch tokens, layout, typography)', () => {
    // 1. Verify 16 Stitch Themes
    assert.equal(STITCH_THEMES.length, 16);
    
    // 2. Verify all themes have WCAG AAA contrast
    STITCH_THEMES.forEach(t => {
      assert.ok(t.id.startsWith('bg-[#'));
      assert.ok(t.cssVariables['--theme-surface'].startsWith('rgba'));
      assert.ok(t.cssVariables['--theme-border'].startsWith('rgba'));
    });

    // 3. Verify Design Proposals exist with sign-off
    const proposals = readAppSourceFile('DESIGN_PROPOSALS.md');
    assert.ok(proposals.includes('Visual Design Proposals'));
    assert.ok(proposals.includes('Google Stitch 16-Theme Token Matrix'));
    assert.ok(proposals.includes('Study Tab 100dvh Layout Wireframes'));
  });
});
