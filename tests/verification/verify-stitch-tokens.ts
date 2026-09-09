/**
 * Acceptance Test: Google Stitch Tokens & Universal Theme Remodeling
 * 
 * Verifies:
 * 1. All 16 Stitch theme definitions in src/lib/theme/tokens.ts match page.tsx
 * 2. Every theme has valid Google Stitch tokens and CSS variables
 * 3. src/app/globals.css defines dynamic variables for all 16 [data-theme="bg-[#...]"] selectors
 * 4. NotesPanel.tsx and QuizSession.tsx are free of hardcoded slate colors and use theme variables
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { STITCH_THEMES, getThemeToken, getThemeVariables } from '../../src/lib/theme/tokens.ts';
import { parseThemesFromSource } from '../e2e/theme-helpers.ts';

async function runStitchTokenVerification() {
  console.log('\n========================================================================');
  console.log('  🎨 GOOGLE STITCH DESIGN TOKENS & UNIVERSAL THEME VERIFICATION');
  console.log('========================================================================\n');

  // Test 1: Stitch token parity with page.tsx THEMES
  console.log('[1/4] Verifying Stitch token parity with page.tsx THEMES...');
  const pageThemes = parseThemesFromSource();
  assert.strictEqual(STITCH_THEMES.length, 16, `Expected 16 Stitch themes, got ${STITCH_THEMES.length}`);
  assert.strictEqual(pageThemes.length, 16, `Expected 16 page themes, got ${pageThemes.length}`);

  for (let i = 0; i < pageThemes.length; i++) {
    const pt = pageThemes[i];
    const st = STITCH_THEMES[i];
    assert.strictEqual(st.id, pt.id, `Theme #${i} ID mismatch: ${st.id} vs ${pt.id}`);
    assert.strictEqual(st.name, pt.name, `Theme #${i} name mismatch: ${st.name} vs ${pt.name}`);
    assert.strictEqual(st.color.toLowerCase(), pt.color.toLowerCase(), `Theme #${i} color mismatch`);
  }
  console.log('  ✔ All 16 Stitch theme tokens match page.tsx IDs, names, and hex codes.');

  // Test 2: Stitch Token Schema and CSS variables completeness
  console.log('[2/4] Verifying Stitch Token Schema & dynamic CSS variable definitions...');
  const requiredVars = [
    '--theme-bg',
    '--theme-surface',
    '--theme-surface-elevated',
    '--theme-surface-subtle',
    '--theme-surface-overlay',
    '--theme-border',
    '--theme-border-subtle',
    '--theme-primary',
    '--theme-primary-hover',
    '--theme-text-primary',
    '--theme-text-secondary',
    '--theme-text-muted',
    '--theme-focus-ring'
  ] as const;

  for (const t of STITCH_THEMES) {
    assert.ok(t.customColor && /^#[0-9a-fA-F]{6}$/.test(t.customColor), `Theme ${t.name} invalid customColor`);
    assert.ok(t.neutralColor && /^#[0-9a-fA-F]{6}$/.test(t.neutralColor), `Theme ${t.name} invalid neutralColor`);
    assert.ok(['TONAL_SPOT', 'VIBRANT', 'EXPRESSIVE', 'NEUTRAL', 'MONOCHROME'].includes(t.colorVariant), `Theme ${t.name} invalid variant`);

    for (const v of requiredVars) {
      assert.ok(t.cssVariables[v], `Theme ${t.name} missing CSS variable: ${v}`);
    }

    // Helper function checks
    const resolved = getThemeToken(t.id);
    assert.strictEqual(resolved.id, t.id);
    const resolvedVars = getThemeVariables(t.slug);
    assert.strictEqual(resolvedVars['--theme-bg'], t.color);
  }
  console.log('  ✔ All 16 themes possess complete Google Stitch schemas and 13 CSS variables.');

  // Test 3: globals.css Selector Coverage
  console.log('[3/4] Verifying src/app/globals.css selector and variable mappings...');
  const globalsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

  for (const t of STITCH_THEMES) {
    const selectorPattern = `[data-theme="${t.id}"]`;
    assert.ok(globalsCss.includes(selectorPattern), `globals.css missing selector: ${selectorPattern}`);
    assert.ok(globalsCss.includes(`[data-theme="${t.slug}"]`), `globals.css missing slug selector: ${t.slug}`);
  }

  assert.ok(globalsCss.includes('.theme-surface'), 'globals.css missing .theme-surface utility');
  assert.ok(globalsCss.includes('.theme-surface-elevated'), 'globals.css missing .theme-surface-elevated utility');
  assert.ok(globalsCss.includes('.theme-btn-primary'), 'globals.css missing .theme-btn-primary utility');
  console.log('  ✔ globals.css contains dual selectors and utility classes for all 16 themes.');

  // Test 4: Theme Reactivity in NotesPanel.tsx & QuizSession.tsx
  console.log('[4/4] Verifying elimination of hardcoded slate colors in NotesPanel & QuizSession...');
  const notesPanelSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/study/NotesPanel.tsx'), 'utf8');
  const quizSessionSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/study/QuizSession.tsx'), 'utf8');

  assert.ok(!notesPanelSrc.includes('bg-slate-900'), 'NotesPanel.tsx still contains bg-slate-900');
  assert.ok(!notesPanelSrc.includes('bg-[#12141c]'), 'NotesPanel.tsx still contains bg-[#12141c]');
  assert.ok(!notesPanelSrc.includes('border-slate-800'), 'NotesPanel.tsx still contains border-slate-800');
  assert.ok(notesPanelSrc.includes('var(--theme-surface)'), 'NotesPanel.tsx must use var(--theme-surface)');
  assert.ok(notesPanelSrc.includes('var(--theme-border)'), 'NotesPanel.tsx must use var(--theme-border)');

  assert.ok(!quizSessionSrc.includes('bg-slate-800/50'), 'QuizSession.tsx still contains bg-slate-800/50');
  assert.ok(!quizSessionSrc.includes('border-slate-800'), 'QuizSession.tsx still contains border-slate-800');
  assert.ok(!quizSessionSrc.includes('border-slate-700'), 'QuizSession.tsx still contains border-slate-700');
  assert.ok(quizSessionSrc.includes('var(--theme-surface-subtle)'), 'QuizSession.tsx must use var(--theme-surface-subtle)');
  assert.ok(quizSessionSrc.includes('var(--theme-border)'), 'QuizSession.tsx must use var(--theme-border)');
  assert.ok(quizSessionSrc.includes('var(--theme-primary)'), 'QuizSession.tsx must use var(--theme-primary)');

  console.log('  ✔ NotesPanel.tsx and QuizSession.tsx strictly utilize dynamic theme variables.\n');
  console.log('========================================================================');
  console.log('🎉 ALL GOOGLE STITCH TOKEN & THEME CHECKS PASSED (4/4)!');
  console.log('========================================================================\n');
}

runStitchTokenVerification().catch(err => {
  console.error('❌ Stitch Token Verification Failed:', err);
  process.exit(1);
});
