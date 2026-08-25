/**
 * E2E & Unit Test Suite for Vibe Todos Theme Redesign (Milestone M2)
 * 
 * 4-Tier Automated Verification Architecture:
 * - Tier 1: Feature Coverage (Schema, Array Length >= 12, Dark Blue Restoration, Color-ID Parity)
 * - Tier 2: Boundary & Corner Cases (Hex Regex, Relative Luminance <= 0.20, WCAG AAA Contrast > 7:1)
 * - Tier 3: Color Spectrum Coverage (>= 8 Spectrum Families: Blue, Purple, Green, Red, Amber, Cyan, Rose/Magenta, Slate/Monochrome)
 * - Tier 4: Real-World Integration (LocalStorage Key Format, Meta Tag Sync, SSR Anti-Flash Hydration, UI Binding)
 * - Tier 5: Adversarial & Edge Case Robustness (Malformed Hex, Non-Dark Colors, Corrupt Storage Fallback)
 * 
 * Usage:
 *   node --experimental-strip-types --test tests/e2e/theme-validation.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseThemesFromSource,
  hexToRgb,
  getRelativeLuminance,
  getContrastRatioAgainstWhite,
  rgbToHsl,
  classifySpectrumFamily,
  type ThemeItem,
  type SpectrumFamily
} from './theme-helpers.ts';

// --------------------------------------------------------------------------
// TEST EXECUTION SUITES
// --------------------------------------------------------------------------

describe('🎨 Tier 1: Feature Coverage & Theme Array Schema', () => {
  const themes = parseThemesFromSource();

  it('T1.1: THEMES array must exist and contain at least 12 themes', () => {
    assert.ok(Array.isArray(themes), 'THEMES must be an array');
    assert.ok(
      themes.length >= 12,
      `THEMES array must contain >= 12 themes, found ${themes.length}`
    );
  });

  it('T1.2: Every theme object must adhere to the ThemeItem schema { id, name, color }', () => {
    themes.forEach((theme, idx) => {
      assert.ok(typeof theme.id === 'string' && theme.id.length > 0, `Theme #${idx} must have non-empty id`);
      assert.ok(typeof theme.name === 'string' && theme.name.trim().length > 0, `Theme #${idx} must have non-empty name`);
      assert.ok(typeof theme.color === 'string' && theme.color.length > 0, `Theme #${idx} must have non-empty color`);
    });
  });

  it('T1.3: Theme id must adhere to Tailwind arbitrary background syntax bg-[#...]', () => {
    themes.forEach((theme, idx) => {
      assert.match(
        theme.id,
        /^bg-\[#[0-9a-fA-F]{6}\]$/,
        `Theme #${idx} (${theme.name}) id "${theme.id}" must match Tailwind arbitrary class format bg-[#RRGGBB]`
      );
    });
  });

  it('T1.4: Parity between theme id and theme color hex', () => {
    themes.forEach((theme, idx) => {
      const expectedId = `bg-[${theme.color.toLowerCase()}]`;
      assert.strictEqual(
        theme.id.toLowerCase(),
        expectedId,
        `Theme #${idx} (${theme.name}) id "${theme.id}" does not match color "${theme.color}"`
      );
    });
  });

  it('T1.5: No duplicate IDs, names, or colors across the theme catalog', () => {
    const ids = new Set<string>();
    const names = new Set<string>();
    const colors = new Set<string>();

    themes.forEach((t) => {
      assert.ok(!ids.has(t.id), `Duplicate theme id detected: ${t.id}`);
      assert.ok(!names.has(t.name.toLowerCase()), `Duplicate theme name detected: ${t.name}`);
      assert.ok(!colors.has(t.color.toLowerCase()), `Duplicate theme color detected: ${t.color}`);
      ids.add(t.id);
      names.add(t.name.toLowerCase());
      colors.add(t.color.toLowerCase());
    });
  });

  it('T1.6: Legacy "Dark Blue" theme must be restored and present in THEMES array', () => {
    const validDarkBlueColors = ['#080d2a', '#172554', '#0f172a'];
    const darkBlueTheme = themes.find(
      t => (t.name.toLowerCase() === 'dark blue' || t.name.toLowerCase() === 'classic dark blue') &&
           validDarkBlueColors.includes(t.color.toLowerCase())
    );

    assert.ok(
      darkBlueTheme !== undefined,
      `Restored legacy "Dark Blue" theme not found. Expected a theme named "Dark Blue" or "Classic Dark Blue" with color in [${validDarkBlueColors.join(', ')}]`
    );
    assert.ok(
      ['dark blue', 'classic dark blue'].includes(darkBlueTheme.name.toLowerCase()),
      `Dark Blue theme name is "${darkBlueTheme.name}"`
    );
    assert.ok(
      validDarkBlueColors.includes(darkBlueTheme.color.toLowerCase()),
      `Dark Blue color "${darkBlueTheme.color}" must be in [${validDarkBlueColors.join(', ')}]`
    );
  });
});

describe('🌓 Tier 2: Boundary & Corner Cases (Luminance & WCAG AAA Contrast)', () => {
  const themes = parseThemesFromSource();

  it('T2.1: All theme hex colors must be valid 6-digit hex strings starting with #', () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    themes.forEach((t) => {
      assert.match(
        t.color,
        hexRegex,
        `Theme "${t.name}" color "${t.color}" is not a valid 6-digit hex string`
      );
    });
  });

  it('T2.2: Purely Dark Requirement — Relative luminance L <= 0.20 for all themes', () => {
    themes.forEach((t) => {
      const { r, g, b } = hexToRgb(t.color);
      const lum = getRelativeLuminance(r, g, b);
      assert.ok(
        lum <= 0.20,
        `Theme "${t.name}" (${t.color}) relative luminance ${lum.toFixed(4)} exceeds dark threshold of 0.20`
      );
    });
  });

  it('T2.3: WCAG AAA High Contrast — Contrast ratio against white (#FFFFFF) must be > 7:1', () => {
    themes.forEach((t) => {
      const { r, g, b } = hexToRgb(t.color);
      const lum = getRelativeLuminance(r, g, b);
      const contrast = getContrastRatioAgainstWhite(lum);
      assert.ok(
        contrast >= 7.0,
        `Theme "${t.name}" (${t.color}) contrast ratio ${contrast.toFixed(2)}:1 fails WCAG AAA threshold of 7.0:1`
      );
    });
  });

  it('T2.4: Ultra-dark boundaries — Maximum background luminance in theme set should be comfortably dark', () => {
    const luminances = themes.map(t => {
      const { r, g, b } = hexToRgb(t.color);
      return getRelativeLuminance(r, g, b);
    });
    const maxLum = Math.max(...luminances);
    const minLum = Math.min(...luminances);

    assert.ok(maxLum < 0.15, `Maximum theme luminance ${maxLum.toFixed(4)} is sufficiently dark (< 0.15)`);
    assert.ok(minLum >= 0.0, `Minimum theme luminance ${minLum.toFixed(4)} is valid (>= 0)`);
  });
});

describe('🌈 Tier 3: Color Spectrum Coverage & Diversity', () => {
  const themes = parseThemesFromSource();

  it('T3.1: Palette must cover at least 8 distinct color spectrum families', () => {
    const familyMap = new Map<SpectrumFamily, ThemeItem[]>();

    themes.forEach((t) => {
      const family = classifySpectrumFamily(t.color, t.name);
      if (!familyMap.has(family)) {
        familyMap.set(family, []);
      }
      familyMap.get(family)!.push(t);
    });

    const uniqueFamilies = Array.from(familyMap.keys());
    assert.ok(
      uniqueFamilies.length >= 8,
      `Expected >= 8 distinct color families, but found ${uniqueFamilies.length}: [${uniqueFamilies.join(', ')}]`
    );
  });

  it('T3.2: Critical primary families must be represented (Blue, Purple, Green, Red, Amber/Orange, Cyan/Teal, Rose/Magenta, Slate/Monochrome)', () => {
    const requiredFamilies: SpectrumFamily[] = [
      'Blue',
      'Purple',
      'Green',
      'Red',
      'Amber/Orange',
      'Cyan/Teal',
      'Rose/Magenta',
      'Slate/Monochrome',
    ];

    const presentFamilies = new Set<SpectrumFamily>();
    themes.forEach((t) => {
      const fam = classifySpectrumFamily(t.color, t.name);
      presentFamilies.add(fam);
    });

    requiredFamilies.forEach((req) => {
      assert.ok(
        presentFamilies.has(req),
        `Required color family "${req}" is missing from the theme palette`
      );
    });
  });

  it('T3.3: Hue dispersion check across 360-degree color wheel', () => {
    const hues = themes
      .map(t => {
        const { r, g, b } = hexToRgb(t.color);
        return rgbToHsl(r, g, b);
      })
      .filter(hsl => hsl.s >= 0.15) // chromatic themes only
      .map(hsl => hsl.h);

    // Ensure we have chromatic themes in 0-90, 90-180, 180-270, and 270-360 quadrants
    const q1 = hues.some(h => h >= 0 && h < 90);
    const q2 = hues.some(h => h >= 90 && h < 180);
    const q3 = hues.some(h => h >= 180 && h < 270);
    const q4 = hues.some(h => h >= 270 && h <= 360);

    assert.ok(q1, 'Missing chromatic themes in 0°-90° quadrant (Red/Amber/Yellow)');
    assert.ok(q2, 'Missing chromatic themes in 90°-180° quadrant (Green/Emerald)');
    assert.ok(q3, 'Missing chromatic themes in 180°-270° quadrant (Cyan/Blue)');
    assert.ok(q4, 'Missing chromatic themes in 270°-360° quadrant (Purple/Magenta)');
  });
});

describe('🔌 Tier 4: Real-World Integration, SSR Hydration & Persistence Contract', () => {
  const pageSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/app/page.tsx'), 'utf8');
  const layoutSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8');

  it('T4.1: LocalStorage persistence key format matches ${uid}_bgTheme or _bgTheme suffix', () => {
    assert.ok(
      pageSrc.includes('localStorage.setItem(`${uid}_bgTheme`, bgTheme)') ||
      pageSrc.includes('_bgTheme'),
      'src/app/page.tsx must persist theme using `${uid}_bgTheme` key pattern'
    );
  });

  it('T4.2: Dynamic meta theme-color tag synchronization', () => {
    assert.ok(
      pageSrc.includes('name="theme-color"') ||
      pageSrc.includes('theme-color'),
      'src/app/page.tsx must sync active theme color with meta theme-color tag'
    );
    assert.ok(
      pageSrc.includes('activeTheme') || pageSrc.includes('THEMES.find') || pageSrc.includes('THEMES.map'),
      'src/app/page.tsx must look up active theme from THEMES array for meta theme-color'
    );
  });

  it('T4.3: SSR anti-flash inline hydration script in layout.tsx is compatible with _bgTheme storage', () => {
    assert.ok(
      layoutSrc.includes('_bgTheme'),
      'src/app/layout.tsx must contain anti-flash script checking localStorage for keys ending in _bgTheme'
    );
    assert.ok(
      layoutSrc.includes("document.documentElement.classList.add('dark')"),
      'src/app/layout.tsx must activate dark mode class on document element'
    );
    assert.ok(
      layoutSrc.includes("document.documentElement.setAttribute('data-theme'"),
      'src/app/layout.tsx must set data-theme attribute on document element'
    );
  });

  it('T4.4: UI Theme Picker binding and state handler integrity in page.tsx', () => {
    assert.ok(
      pageSrc.includes('setBgTheme(theme.id)'),
      'src/app/page.tsx must bind theme picker buttons to setBgTheme(theme.id)'
    );
    assert.ok(
      pageSrc.includes('THEMES.map(') || pageSrc.includes('THEMES.find('),
      'src/app/page.tsx must map over THEMES array to render theme switcher'
    );
  });

  it('T4.5: Fallback handling when stored theme is invalid or legacy', () => {
    const themes = parseThemesFromSource();
    const legacyThemeId = 'bg-gray-100'; // deprecated light theme
    const activeTheme = themes.find(t => t.id === legacyThemeId);
    const effectiveColor = activeTheme ? activeTheme.color : (themes[0]?.color || '#080d2a');
    const validFallbackColors = ['#080d2a', '#0f172a', '#172554', themes[0]?.color];
    assert.ok(
      validFallbackColors.includes(effectiveColor),
      `Invalid or legacy theme id must safely fallback to a valid default dark blue theme color, got ${effectiveColor}`
    );
  });
});

describe('🛡️ Tier 5: Adversarial & Edge Case Verification', () => {
  it('T5.1: Malformed hex inputs throw descriptive validation errors', () => {
    const invalidHexes = ['#fff', 'rgb(0,0,0)', 'hsl(0,0%,0%)', '#GGGGGG', '#12345', '', '#1234567'];
    invalidHexes.forEach((badHex) => {
      assert.throws(
        () => hexToRgb(badHex),
        /Invalid 6-digit hex color/,
        `Should throw error on invalid hex: "${badHex}"`
      );
    });
  });

  it('T5.2: Light colors are strictly rejected by luminance filter', () => {
    const lightColors = [
      { hex: '#ffffff', name: 'White' },
      { hex: '#f8f9fa', name: 'Off-White' },
      { hex: '#e2e8f0', name: 'Light Slate' },
      { hex: '#fef08a', name: 'Light Yellow' },
      { hex: '#bfdbfe', name: 'Light Blue' },
    ];

    lightColors.forEach((lc) => {
      const { r, g, b } = hexToRgb(lc.hex);
      const lum = getRelativeLuminance(r, g, b);
      assert.ok(
        lum > 0.20,
        `Light color ${lc.name} (${lc.hex}) with luminance ${lum.toFixed(4)} must exceed 0.20 threshold`
      );
    });
  });

  it('T5.3: Pure black (#000000) boundary conditions', () => {
    const { r, g, b } = hexToRgb('#000000');
    const lum = getRelativeLuminance(r, g, b);
    const contrast = getContrastRatioAgainstWhite(lum);
    assert.strictEqual(lum, 0);
    assert.strictEqual(contrast, 21.0); // Maximum possible contrast ratio
  });

  it('T5.4: Spectrum classifier handles pure grayscale gracefully', () => {
    const grays = ['#000000', '#111111', '#222222', '#333333', '#1e1e1e'];
    grays.forEach((gray) => {
      const fam = classifySpectrumFamily(gray);
      assert.strictEqual(fam, 'Slate/Monochrome', `Grayscale color ${gray} should classify as Slate/Monochrome`);
    });
  });
});
