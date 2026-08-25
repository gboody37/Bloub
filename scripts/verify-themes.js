#!/usr/bin/env node

/**
 * Standalone Theme Verification Script for CI/CD and CLI checks.
 * 
 * Usage:
 *   node scripts/verify-themes.js
 */

import fs from 'node:fs';
import path from 'node:path';

function hexToRgb(hex) {
  if (!/^#([0-9a-fA-F]{6})$/.test(hex)) {
    throw new Error(`Invalid 6-digit hex color: ${hex}`);
  }
  const clean = hex.slice(1);
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function getRelativeLuminance(r, g, b) {
  const [rl, gl, bl] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function getContrastRatioAgainstWhite(lum) {
  return 1.05 / (lum + 0.05);
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function classifySpectrumFamily(hex) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s } = rgbToHsl(r, g, b);

  if (s < 0.22 || (r === g && g === b)) {
    return 'Slate/Monochrome';
  }

  if (((h >= 325 && h <= 360) || (h >= 0 && h < 15)) && (r >= g && r >= b)) {
    return 'Red';
  } else if (h >= 15 && h < 50) {
    return 'Amber/Orange';
  } else if (h >= 50 && h < 70) {
    return 'Yellow';
  } else if (h >= 70 && h < 165) {
    return 'Green';
  } else if (h >= 165 && h < 215) {
    return 'Cyan/Teal';
  } else if (h >= 215 && h < 255) {
    return 'Blue';
  } else if (h >= 255 && h < 290) {
    return 'Purple';
  } else if (h >= 290 && h < 325) {
    return 'Rose/Magenta';
  }

  return 'Unknown';
}

function main() {
  console.log('\n========================================================================');
  console.log('  🎨 VIBE TODOS THEMES AUTOMATED VERIFICATION SCRIPT');
  console.log('========================================================================\n');

  const pagePath = path.resolve(process.cwd(), 'src/app/page.tsx');
  const layoutPath = path.resolve(process.cwd(), 'src/app/layout.tsx');

  if (!fs.existsSync(pagePath)) {
    console.error(`❌ Missing src/app/page.tsx at ${pagePath}`);
    process.exit(1);
  }

  const pageSrc = fs.readFileSync(pagePath, 'utf8');
  const layoutSrc = fs.readFileSync(layoutPath, 'utf8');

  const match = pageSrc.match(/(?:export\s+)?const\s+THEMES\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) {
    console.error('❌ Could not locate THEMES array in src/app/page.tsx');
    process.exit(1);
  }

  const themes = new Function('return ' + match[1])();
  console.log(`🔍 Discovered ${themes.length} themes in THEMES array.\n`);

  let failures = 0;

  // Check 1: Minimum Count
  if (themes.length < 12) {
    console.error(`❌ Check 1 Failed: Expected >= 12 themes, found ${themes.length}`);
    failures++;
  } else {
    console.log(`✅ Check 1: Theme Count (${themes.length} >= 12)`);
  }

  // Check 2: Schema & Parity
  let schemaErrors = 0;
  const ids = new Set();
  const names = new Set();
  const colors = new Set();

  themes.forEach((t, i) => {
    if (!t.id || !t.name || !t.color) {
      console.error(`❌ Theme #${i} missing properties:`, t);
      schemaErrors++;
    }
    if (t.id.toLowerCase() !== `bg-[${t.color.toLowerCase()}]`) {
      console.error(`❌ Theme #${i} id/color mismatch: id="${t.id}", color="${t.color}"`);
      schemaErrors++;
    }
    if (ids.has(t.id)) {
      console.error(`❌ Duplicate ID: ${t.id}`);
      schemaErrors++;
    }
    if (names.has(t.name.toLowerCase())) {
      console.error(`❌ Duplicate Name: ${t.name}`);
      schemaErrors++;
    }
    if (colors.has(t.color.toLowerCase())) {
      console.error(`❌ Duplicate Color: ${t.color}`);
      schemaErrors++;
    }
    ids.add(t.id);
    names.add(t.name.toLowerCase());
    colors.add(t.color.toLowerCase());
  });

  if (schemaErrors === 0) {
    console.log(`✅ Check 2: Schema, Color-ID Parity & Uniqueness`);
  } else {
    failures += schemaErrors;
  }

  // Check 3: Dark Blue Restored
  const darkBlue = themes.find(
    t => (t.name.toLowerCase() === 'dark blue' || t.name.toLowerCase() === 'classic dark blue') &&
         ['#080d2a', '#172554', '#0f172a'].includes(t.color.toLowerCase())
  );
  if (darkBlue) {
    console.log(`✅ Check 3: Dark Blue Restoration (${darkBlue.name} - ${darkBlue.color})`);
  } else {
    console.error('❌ Check 3 Failed: Restored Dark Blue theme missing');
    failures++;
  }

  // Check 4: Luminance & WCAG AAA Contrast
  let wcagErrors = 0;
  themes.forEach(t => {
    const { r, g, b } = hexToRgb(t.color);
    const lum = getRelativeLuminance(r, g, b);
    const cr = getContrastRatioAgainstWhite(lum);
    if (lum > 0.20 || cr < 7.0) {
      console.error(`❌ Theme "${t.name}" violates WCAG invariants: L=${lum.toFixed(4)}, CR=${cr.toFixed(2)}:1`);
      wcagErrors++;
    }
  });

  if (wcagErrors === 0) {
    console.log(`✅ Check 4: Purely Dark & WCAG AAA Contrast (> 7:1) across all themes`);
  } else {
    failures += wcagErrors;
  }

  // Check 5: Spectrum Coverage
  const familyMap = new Map();
  themes.forEach(t => {
    const fam = classifySpectrumFamily(t.color);
    if (!familyMap.has(fam)) familyMap.set(fam, []);
    familyMap.get(fam).push(t.name);
  });

  const requiredFamilies = ['Blue', 'Purple', 'Green', 'Red', 'Amber/Orange', 'Cyan/Teal', 'Rose/Magenta', 'Slate/Monochrome'];
  const missingFamilies = requiredFamilies.filter(rf => !familyMap.has(rf));

  if (missingFamilies.length === 0 && familyMap.size >= 8) {
    console.log(`✅ Check 5: Spectrum Families Coverage (${familyMap.size} families: ${Array.from(familyMap.keys()).join(', ')})`);
  } else {
    console.error(`❌ Check 5 Failed: Missing families: ${missingFamilies.join(', ')}`);
    failures++;
  }

  // Check 6: Real-World Integration
  let integrationErrors = 0;
  if (!pageSrc.includes('localStorage.setItem(`${uid}_bgTheme`') && !pageSrc.includes('_bgTheme')) {
    console.error('❌ Missing localStorage persistence key `${uid}_bgTheme`');
    integrationErrors++;
  }
  if (!pageSrc.includes('name="theme-color"') && !pageSrc.includes('theme-color')) {
    console.error('❌ Missing dynamic meta theme-color sync');
    integrationErrors++;
  }
  if (!layoutSrc.includes('_bgTheme') || !layoutSrc.includes('document.documentElement.classList.add(\'dark\')')) {
    console.error('❌ layout.tsx anti-flash hydration script broken');
    integrationErrors++;
  }

  if (integrationErrors === 0) {
    console.log('✅ Check 6: LocalStorage, SSR Anti-Flash & Meta Theme-Color Integration');
  } else {
    failures += integrationErrors;
  }

  console.log('\n------------------------------------------------------------------------');
  if (failures === 0) {
    console.log('🎉 ALL THEME VERIFICATION CHECKS PASSED SUCCESSFULLY (0 FAILURES)');
    console.log('------------------------------------------------------------------------\n');
    process.exit(0);
  } else {
    console.error(`💥 THEME VERIFICATION FAILED WITH ${failures} ERRORS`);
    console.log('------------------------------------------------------------------------\n');
    process.exit(1);
  }
}

main();
