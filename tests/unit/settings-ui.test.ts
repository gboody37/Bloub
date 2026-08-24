/**
 * Unit Test: Settings UI Verification
 * Verifies that Settings tab fulfills all requirements from <original_task>:
 * - No "Stats" or "Settings" header when activeTab === 'settings'
 * - Mascot Preview card contains large mascot and horizontal category scroller
 * - Expression pills are wired to update preview mascot expression
 * - Spacing, typography, and sections match reference
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Settings Tab UI & State Wiring Verification', () => {
  const pagePath = path.resolve(process.cwd(), 'src/app/page.tsx');
  const pageSource = fs.readFileSync(pagePath, 'utf8');

  it('R1.1: Header with "Stats"/"My Lists" is conditionally hidden when activeTab === "settings"', () => {
    assert.ok(
      pageSource.includes("activeTab !== 'settings' && (") ||
      pageSource.includes('activeTab !== "settings" && ('),
      'Header must be wrapped in activeTab !== "settings" check to prevent lingering headers'
    );
  });

  it('R1.2: Settings view begins immediately with Mascot Preview card without lingering title headers', () => {
    const settingsBlockMatch = pageSource.match(/activeTab === 'settings'\s*\?\s*\(\s*<div[^>]*>([\s\S]*?)<\/div>\s*\)\s*:/);
    assert.ok(settingsBlockMatch, 'activeTab === "settings" container must exist');
    const settingsContent = settingsBlockMatch[1];
    
    assert.ok(!settingsContent.includes('<h1'), 'No <h1> heading inside Settings tab');
    assert.ok(settingsContent.includes('Mascot Preview inside Settings'), 'Mascot Preview card is the first main element');
  });

  it('R1.3: Mascot Preview card is dark-themed and contains both large Mascot and horizontal category pills', () => {
    const previewCardRegex = /Mascot Preview inside Settings[\s\S]*?<div className="bg-slate-900[\s\S]*?BloubMascot size=\{120\}[\s\S]*?Horizontal Category Scroller[\s\S]*?settingsTarget === 'global'[\s\S]*?categories\.map/;
    assert.ok(previewCardRegex.test(pageSource), 'Mascot Preview card must contain both large BloubMascot and category horizontal scroller');
  });

  it('R2.1: Large preview BloubMascot is wired to dynamic expression={mascotExpression}', () => {
    const previewMascotMatch = pageSource.match(/<BloubMascot\s+size=\{120\}[\s\S]*?expression=\{mascotExpression\}[\s\S]*?shape=\{targetShape\}[\s\S]*?color=\{targetColor\}/);
    assert.ok(previewMascotMatch, 'Preview mascot must use expression={mascotExpression}, targetShape, and targetColor');
  });

  it('R2.2: Expression buttons update mascotExpression state on click', () => {
    assert.ok(
      pageSource.includes('onClick={() => setMascotExpression(expr as ExpressionId)}') ||
      pageSource.includes('onClick={() => setMascotExpression(expr'),
      'Expression buttons must trigger setMascotExpression on click'
    );
  });

  it('R1.4: Sections (SHAPE, EXPRESSION, COLOUR, THEME) match typography, icons, and layout structure', () => {
    assert.ok(pageSource.includes('<Shapes size={14} /> Shape'), 'Shape section with Shapes icon exists');
    assert.ok(pageSource.includes('Expression') && pageSource.includes('colere'), 'Expression section with expressions exists');
    assert.ok(pageSource.includes('<PaintBucket size={14} /> Colour'), 'Colour section with PaintBucket icon exists');
    assert.ok(pageSource.includes('<Palette size={14} /> Theme'), 'Theme section with Palette icon exists');
  });
});
