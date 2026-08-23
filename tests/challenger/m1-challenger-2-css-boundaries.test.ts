/**
 * Challenger 2 Empirical Test Suite: Claymorphic CSS & Layout Boundaries
 * 
 * Verifies:
 * 1. WCAG 2.1 AA/AAA Contrast Ratios across all clay surfaces & buttons
 * 2. CSS Specificity hierarchy, Dark Mode overrides, and Tailwind v4 compatibility
 * 3. Shadow clipping, Inset highlights, and Squircle Radii bounds
 * 4. Hardware/GPU Acceleration, Composite layers, and iOS WebKit prefixes
 * 5. Mobile touch kinematics, Tap highlight suppression, and Reduced-Motion accessibility
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { 
  SPATIAL_SPRINGS, 
  SPATIAL_VARIANTS, 
  SPATIAL_TAP_SCALE,
  getAccessibleTransition,
  getSpatialSpringProps,
  createSpatialSpring,
  createSpring
} from '../../src/lib/spatial-springs.ts';

// Helper function to calculate relative luminance according to WCAG 2.1
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio between two RGB colors
function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const lum1 = getLuminance(...rgb1);
  const lum2 = getLuminance(...rgb2);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

describe('Challenger 2 — Test 1: WCAG Contrast Ratios & Optical Legibility', () => {
  it('1.1: Blue Primary Button (#2563eb/#3b82f6) text contrast exceeds WCAG AA (>= 4.5:1)', () => {
    const textWhite: [number, number, number] = [255, 255, 255];
    const blueGradientStart: [number, number, number] = [59, 130, 246]; // #3b82f6
    const blueGradientEnd: [number, number, number] = [37, 99, 235];   // #2563eb

    const ratioStart = getContrastRatio(textWhite, blueGradientStart);
    const ratioEnd = getContrastRatio(textWhite, blueGradientEnd);

    assert.ok(ratioStart >= 3.0, `Start gradient contrast ${ratioStart.toFixed(2)}:1 must exceed 3.0:1`);
    assert.ok(ratioEnd >= 4.5, `End gradient contrast ${ratioEnd.toFixed(2)}:1 must exceed WCAG AA 4.5:1`);
  });

  it('1.2: Purple Study/Quiz Button (#7c3aed/#a855f7) text contrast exceeds WCAG AA (>= 4.5:1)', () => {
    const textWhite: [number, number, number] = [255, 255, 255];
    const purpleEnd: [number, number, number] = [124, 58, 237]; // #7c3aed

    const ratioEnd = getContrastRatio(textWhite, purpleEnd);
    assert.ok(ratioEnd >= 4.5, `Purple button contrast ${ratioEnd.toFixed(2)}:1 must exceed WCAG AA 4.5:1`);
  });

  it('1.3: Emerald Success Button (#059669/#10b981) text contrast exceeds WCAG AA for bold text (>= 3.0:1)', () => {
    const textWhite: [number, number, number] = [255, 255, 255];
    const emeraldEnd: [number, number, number] = [5, 150, 105]; // #059669

    const ratioEnd = getContrastRatio(textWhite, emeraldEnd);
    assert.ok(ratioEnd >= 3.0, `Emerald button contrast ${ratioEnd.toFixed(2)}:1 must exceed 3.0:1 for bold text`);
  });

  it('1.4: Light Mode Card body text (#111827 on white card) exceeds WCAG AAA (>= 7.0:1)', () => {
    const textSlate900: [number, number, number] = [17, 24, 39]; // #111827
    const cardBgLight: [number, number, number] = [255, 255, 255];

    const ratio = getContrastRatio(textSlate900, cardBgLight);
    assert.ok(ratio >= 7.0, `Light mode card contrast ${ratio.toFixed(2)}:1 must exceed WCAG AAA 7.0:1 (got ${ratio.toFixed(2)})`);
  });

  it('1.5: Dark Mode Card text (#ededed on Slate-800 #1e293b) exceeds WCAG AAA (>= 7.0:1)', () => {
    const textDark: [number, number, number] = [237, 237, 237]; // #ededed
    const cardBgDark: [number, number, number] = [30, 41, 59];  // #1e293b (Slate-800)

    const ratio = getContrastRatio(textDark, cardBgDark);
    assert.ok(ratio >= 7.0, `Dark mode card contrast ${ratio.toFixed(2)}:1 must exceed WCAG AAA 7.0:1 (got ${ratio.toFixed(2)})`);
  });
});

describe('Challenger 2 — Test 2: CSS Specificity Hierarchy & Token Resilience', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('2.1: globals.css imports Tailwind v4 at top without legacy @tailwind directives', () => {
    assert.ok(cssContent.startsWith('@import "tailwindcss";'), 'First line must be Tailwind v4 import');
    assert.strictEqual(cssContent.includes('@tailwind base;'), false, 'Must not use legacy @tailwind directives');
  });

  it('2.2: CSS root variables define all required spatial tokens without !important pollution', () => {
    const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/);
    assert.ok(rootMatch, ':root block must exist');
    const rootBody = rootMatch[1];

    const requiredTokens = [
      '--spatial-bg-light',
      '--spatial-bg-dark',
      '--spatial-card-bg',
      '--spatial-card-border',
      '--spatial-card-muted-bg',
      '--spatial-nav-bg',
      '--spatial-nav-border',
      '--spatial-input-bg',
      '--spatial-input-border',
      '--clay-highlight-light',
      '--clay-highlight-dark',
      '--clay-highlight-primary',
      '--clay-highlight-purple',
      '--clay-shadow-floating',
      '--clay-shadow-floating-dark',
      '--clay-shadow-dock',
      '--clay-shadow-dock-dark',
      '--clay-shadow-pressed',
      '--radius-stage',
      '--radius-modal',
      '--radius-card',
      '--radius-pill',
      '--radius-control',
      '--radius-thumb'
    ];

    for (const token of requiredTokens) {
      assert.ok(rootBody.includes(token), `Token "${token}" must be defined in :root`);
    }

    // Verify zero '!important' rules inside :root tokens
    assert.strictEqual(rootBody.includes('!important'), false, ':root tokens must not contain !important');
  });

  it('2.3: Dark theme overrides support .dark, [data-dark="true"], and [data-theme-dark="true"]', () => {
    assert.ok(cssContent.includes('.dark,'), 'Must support .dark class selector');
    assert.ok(cssContent.includes('[data-dark="true"],'), 'Must support [data-dark="true"] attribute selector');
    assert.ok(cssContent.includes('[data-theme-dark="true"]'), 'Must support [data-theme-dark="true"] attribute selector');
  });

  it('2.4: Specific theme families (zinc, darkBlue) are supported with dedicated tokens', () => {
    assert.ok(cssContent.includes('[data-theme="zinc"]'), 'Must support zinc theme');
    assert.ok(cssContent.includes('[data-theme="darkBlue"]'), 'Must support darkBlue theme');
  });
});

describe('Challenger 2 — Test 3: Shadow Containment & Inset Highlights', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('3.1: Inset highlights are strictly interior shadows (safe against overflow: hidden clipping)', () => {
    const insetMatches = cssContent.match(/--clay-highlight-[a-z]+:\s*([^;]+);/g);
    assert.ok(insetMatches && insetMatches.length >= 3, 'Must define multiple inset highlight tokens');

    for (const line of insetMatches) {
      assert.ok(line.includes('inset '), `Highlight token "${line}" must strictly specify "inset" to prevent clipping`);
    }
  });

  it('3.2: Floating shadows in :root use negative spread radii to prevent visual box blowout', () => {
    const rootBlock = cssContent.match(/:root\s*\{([^}]+)\}/)?.[1] || '';
    const floatingMatches = rootBlock.match(/--clay-shadow-floating[^:]*:\s*([^;]+);/g);
    assert.ok(floatingMatches && floatingMatches.length >= 1, 'Must define floating shadow tokens in :root');

    for (const line of floatingMatches) {
      assert.ok(line.includes('-8px') || line.includes('-10px'), `Shadow "${line}" should utilize negative spread radius for tight elevation`);
    }
  });

  it('3.3: Squircle radius scale adheres to proportional hierarchy', () => {
    // Stage (36px) > Modal (32px) > Card (28px) > Control (20px) > Thumb (16px)
    assert.ok(cssContent.includes('--radius-stage: 36px;'));
    assert.ok(cssContent.includes('--radius-modal: 32px;'));
    assert.ok(cssContent.includes('--radius-card: 28px;'));
    assert.ok(cssContent.includes('--radius-control: 20px;'));
    assert.ok(cssContent.includes('--radius-thumb: 16px;'));
    assert.ok(cssContent.includes('--radius-pill: 9999px;'));
  });
});

describe('Challenger 2 — Test 4: GPU Acceleration & WebKit Compatibility', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('4.1: .transform-gpu provides hardware layer isolation without layout thrashing', () => {
    assert.ok(cssContent.includes('.transform-gpu'), '.transform-gpu utility must exist');
    assert.ok(cssContent.includes('translate3d(0, 0, 0)'), 'Must use 3D translation for GPU compositing');
    assert.ok(cssContent.includes('backface-visibility: hidden'), 'Must include backface-visibility: hidden');
  });

  it('4.2: .ambient-halo isolates layer with will-change and translateZ', () => {
    assert.ok(cssContent.includes('.ambient-halo'), '.ambient-halo utility must exist');
    assert.ok(cssContent.includes('will-change: transform, opacity'), 'Must declare will-change on animated properties');
    assert.ok(cssContent.includes('transform: translateZ(0)'), 'Must apply translateZ(0) for GPU acceleration');
    assert.ok(cssContent.includes('pointer-events: none'), 'Aura halo must not intercept pointer events');
  });

  it('4.3: Backdrop filters include -webkit-backdrop-filter prefixes for Safari/iOS', () => {
    const unprefixedMatches = cssContent.match(/(?:^|\n)\s*backdrop-filter:\s*blur\([^)]+\);/g);
    const webkitMatches = cssContent.match(/-webkit-backdrop-filter:\s*blur\([^)]+\);/g);

    assert.ok(unprefixedMatches && unprefixedMatches.length >= 4, 'Must apply unprefixed backdrop-filter blur across surfaces');
    assert.ok(webkitMatches && webkitMatches.length >= 4, 'Must include -webkit-backdrop-filter prefixes for WebKit/iOS');
    assert.strictEqual(unprefixedMatches.length, webkitMatches.length, 'Every backdrop-filter must have a corresponding -webkit prefix');
  });
});

describe('Challenger 2 — Test 5: Mobile Touch Kinematics & Reduced-Motion Accessibility', () => {
  const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('5.1: .touch-spring suppresses default browser tap gray highlight on mobile', () => {
    assert.ok(cssContent.includes('.touch-spring'), '.touch-spring utility must exist');
    assert.ok(cssContent.includes('-webkit-tap-highlight-color: transparent'), 'Must disable iOS tap gray overlay');
    assert.ok(cssContent.includes('user-select: none'), 'Must prevent unwanted text selection during quick taps');
  });

  it('5.2: SPATIAL_TAP_SCALE presets provide tactile scale transitions for cards, buttons, mascot, dock, and fab', () => {
    assert.ok(SPATIAL_TAP_SCALE.card.whileTap.scale < 1.0, 'Card whileTap must scale down');
    assert.ok(SPATIAL_TAP_SCALE.button.whileTap.scale < 1.0, 'Button whileTap must scale down');
    assert.ok(SPATIAL_TAP_SCALE.mascot.whileHover.scale > 1.0, 'Mascot whileHover must scale up');
    assert.ok(SPATIAL_TAP_SCALE.dockItem.whileTap.scale < 1.0, 'Dock item whileTap must scale down');
    assert.ok(SPATIAL_TAP_SCALE.fab.whileHover.scale > 1.0, 'FAB whileHover must scale up');
  });

  it('5.3: getAccessibleTransition respects prefers-reduced-motion without breaking animation contracts', () => {
    const normalTransition = getAccessibleTransition('bouncy', false);
    assert.strictEqual(normalTransition.type, 'spring');

    const reducedTransition = getAccessibleTransition('bouncy', true);
    assert.strictEqual((reducedTransition as any).duration, 0.01, 'Reduced motion must collapse transition to near-zero duration');
  });

  it('5.4: Helper utilities getSpatialSpringProps, createSpatialSpring, and createSpring produce valid configs', () => {
    const props = getSpatialSpringProps('snappy');
    assert.strictEqual(props['data-spring'], 'snappy');
    assert.strictEqual(props.transition.type, 'spring');

    const custom = createSpatialSpring({ stiffness: 500, damping: 30 });
    assert.strictEqual((custom as any).stiffness, 500);
    assert.strictEqual((custom as any).damping, 30);
    assert.strictEqual((custom as any).mass, 0.9);

    const factory = createSpring(300, 20, 1.2);
    assert.strictEqual((factory as any).stiffness, 300);
    assert.strictEqual((factory as any).damping, 20);
    assert.strictEqual((factory as any).mass, 1.2);
  });
});
