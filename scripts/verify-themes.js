/**
 * Opaque-box E2E Verification Suite for Theme Redesign
 * 
 * Evaluates:
 * - Tier 1: Feature Coverage (THEMES array existence, length >= 12, required properties)
 * - Tier 2: Boundary & Math Verification (Hex syntax, unique IDs/names, Relative Luminance < 0.25, WCAG AAA Contrast >= 7:1)
 * - Tier 3: Spectrum Distribution & Bias Elimination (HSL hue sector coverage >= 6 sectors, Blue/Brown bias <= 30%)
 * - Tier 4: Legacy Dark Blue Exact Match (Name 'Dark Blue', Color '#172554', ID 'bg-[#172554]' or 'bg-blue-950')
 */

const fs = require('fs');
const path = require('path');

// ANSI Color Helpers
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const GRAY = '\x1b[90m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✓ PASS${RESET} ${message}`);
  } else {
    failedTests++;
    const failMsg = `  ${RED}✗ FAIL${RESET} ${message}${details ? ` -> ${details}` : ''}`;
    console.log(failMsg);
    failures.push({ message, details });
  }
}

// Math Utility Functions
function hexToRgb(hex) {
  const cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length !== 6) return null;
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function computeRelativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return NaN;
  const rLin = srgbToLinear(rgb.r);
  const gLin = srgbToLinear(rgb.g);
  const bLin = srgbToLinear(rgb.b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

function computeWcagContrastAgainstWhite(hex) {
  const L = computeRelativeLuminance(hex);
  const Lwhite = 1.0;
  return (Lwhite + 0.05) / (L + 0.05);
}

function rgbToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 0, l: 0 };
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return { h: Math.round(h * 10) / 10, s: Math.round(s * 1000) / 10, l: Math.round(l * 1000) / 10 };
}

// Hue Sectors (6 Sectors of 60 degrees across 360°)
const HUE_SECTORS = [
  { name: 'Red / Warm Red', min: 330, max: 30, wrap: true },
  { name: 'Orange / Amber / Yellow', min: 30, max: 90, wrap: false },
  { name: 'Green / Lime', min: 90, max: 150, wrap: false },
  { name: 'Teal / Cyan', min: 150, max: 210, wrap: false },
  { name: 'Blue / Indigo', min: 210, max: 270, wrap: false },
  { name: 'Purple / Magenta / Pink', min: 270, max: 330, wrap: false }
];

function getHueSector(hue) {
  for (const sector of HUE_SECTORS) {
    if (sector.wrap) {
      if (hue >= sector.min || hue < sector.max) return sector.name;
    } else {
      if (hue >= sector.min && hue < sector.max) return sector.name;
    }
  }
  return 'Unknown';
}

function isBlueOrBrown(theme) {
  const name = (theme.name || '').toLowerCase();
  const hsl = rgbToHsl(theme.color);
  
  // Blue indicators
  const isBlueHue = hsl.h >= 195 && hsl.h <= 265;
  const isBlueName = name.includes('blue') || name.includes('sky') || name.includes('nordic') || name.includes('frost') || name.includes('sapphire') || name.includes('indigo') || name.includes('ocean');
  
  // Brown / Earth indicators (warm hues 15°-50° with low/moderate saturation, or coffee/mocha/macchiato/frappe/brown names)
  const isBrownName = name.includes('mocha') || name.includes('macchiato') || name.includes('frappé') || name.includes('frappe') || name.includes('brown') || name.includes('coffee') || name.includes('earth') || name.includes('wood') || name.includes('caramel');
  const isBrownHue = (hsl.h >= 15 && hsl.h <= 45) && (hsl.s <= 40);

  return isBlueHue || isBlueName || isBrownName || isBrownHue;
}

// Extraction
function extractThemesFromSource() {
  const pagePath = path.resolve(__dirname, '../src/app/page.tsx');
  if (!fs.existsSync(pagePath)) {
    throw new Error(`Target file not found at ${pagePath}`);
  }
  const content = fs.readFileSync(pagePath, 'utf8');
  const themesMatch = content.match(/const\s+THEMES(?:\s*:\s*[^=]+)?\s*=\s*(\[[\s\S]*?\]);/);
  if (!themesMatch) {
    throw new Error('Could not find `const THEMES = [...]` declaration in src/app/page.tsx');
  }

  try {
    const fn = new Function(`"use strict"; return (${themesMatch[1]});`);
    return fn();
  } catch (err) {
    throw new Error(`Failed to parse THEMES array from page.tsx: ${err.message}`);
  }
}

// Execution
console.log(`${BOLD}${CYAN}====================================================${RESET}`);
console.log(`${BOLD}${CYAN}   VIBE TODOS: THEME REDESIGN E2E VERIFICATION SUITE  ${RESET}`);
console.log(`${BOLD}${CYAN}====================================================${RESET}\n`);

let themes;
try {
  themes = extractThemesFromSource();
  console.log(`${GRAY}Successfully extracted ${themes.length} themes from src/app/page.tsx${RESET}\n`);
} catch (err) {
  console.error(`${RED}FATAL ERROR:${RESET} ${err.message}`);
  process.exit(1);
}

// Print Theme Overview Table
console.log(`${BOLD}Theme Matrix Analysis:${RESET}`);
console.log(`${GRAY}${'ID'.padEnd(18)} | ${'Name'.padEnd(20)} | ${'Hex'.padEnd(9)} | ${'Lum (L)'.padEnd(9)} | ${'Contrast'.padEnd(10)} | ${'Hue (°)'.padEnd(8)} | ${'Sector'.padEnd(26)}${RESET}`);
console.log('-'.repeat(98));

themes.forEach(t => {
  const lum = computeRelativeLuminance(t.color || '');
  const contrast = computeWcagContrastAgainstWhite(t.color || '');
  const hsl = rgbToHsl(t.color || '');
  const sector = getHueSector(hsl.h);
  console.log(
    `${(t.id || 'N/A').padEnd(18)} | ` +
    `${(t.name || 'N/A').padEnd(20)} | ` +
    `${(t.color || 'N/A').padEnd(9)} | ` +
    `${(!isNaN(lum) ? lum.toFixed(4) : 'NaN').padEnd(9)} | ` +
    `${(!isNaN(contrast) ? `${contrast.toFixed(2)}:1` : 'NaN').padEnd(10)} | ` +
    `${(`${hsl.h}°`).padEnd(8)} | ` +
    `${sector.padEnd(26)}`
  );
});
console.log('\n');

// ----------------------------------------------------
// TIER 1: Feature Coverage
// ----------------------------------------------------
console.log(`${BOLD}${MAGENTA}--- TIER 1: FEATURE COVERAGE ---${RESET}`);

assert(Array.isArray(themes), 'THEMES is an array');
assert(themes.length >= 12, `THEMES contains at least 12 themes (found: ${themes.length})`, `Expected >= 12, found ${themes.length}`);

let validStructureCount = 0;
themes.forEach((t, idx) => {
  const hasId = typeof t.id === 'string' && t.id.trim().length > 0;
  const hasName = typeof t.name === 'string' && t.name.trim().length > 0;
  const hasColor = typeof t.color === 'string' && t.color.trim().length > 0;
  if (hasId && hasName && hasColor) {
    validStructureCount++;
  } else {
    assert(false, `Theme #${idx + 1} has valid schema (id, name, color)`, `Invalid theme object: ${JSON.stringify(t)}`);
  }
});
assert(validStructureCount === themes.length, `All ${themes.length} themes have valid { id, name, color } schema`);

console.log('');

// ----------------------------------------------------
// TIER 2: Boundary & Math Verification
// ----------------------------------------------------
console.log(`${BOLD}${MAGENTA}--- TIER 2: BOUNDARY & MATH VERIFICATION ---${RESET}`);

// Hex Syntax
const hexRegex = /^#[0-9a-fA-F]{6}$/;
const invalidHex = themes.filter(t => !hexRegex.test(t.color));
assert(invalidHex.length === 0, 'All theme colors strictly conform to 6-digit hex format (#RRGGBB)', invalidHex.map(t => `${t.name}: ${t.color}`).join(', '));

// Unique IDs
const ids = themes.map(t => t.id);
const uniqueIds = new Set(ids);
assert(uniqueIds.size === ids.length, 'All theme IDs are strictly unique', `Duplicate count: ${ids.length - uniqueIds.size}`);

// Unique Names
const names = themes.map(t => t.name);
const uniqueNames = new Set(names);
assert(uniqueNames.size === names.length, 'All theme names are strictly unique', `Duplicate count: ${names.length - uniqueNames.size}`);

// ID Format Validity (Must be valid Tailwind bg class)
const invalidIdFormat = themes.filter(t => !t.id.startsWith('bg-[') && !t.id.startsWith('bg-'));
assert(invalidIdFormat.length === 0, 'All theme IDs follow valid Tailwind background utility class convention', invalidIdFormat.map(t => t.id).join(', '));

// Relative Luminance Verification (L < 0.25 for dark mode safety)
const nonDarkThemes = themes.filter(t => {
  const L = computeRelativeLuminance(t.color);
  return isNaN(L) || L >= 0.25;
});
assert(nonDarkThemes.length === 0, 'All themes mathematically qualify as dark backgrounds (Relative Luminance L < 0.25)', nonDarkThemes.map(t => `${t.name} (L=${computeRelativeLuminance(t.color).toFixed(4)})`).join(', '));

// WCAG AAA Contrast Ratio vs White (#FFFFFF) >= 7.0:1
const lowContrastThemes = themes.filter(t => {
  const ratio = computeWcagContrastAgainstWhite(t.color);
  return isNaN(ratio) || ratio < 7.0;
});
assert(lowContrastThemes.length === 0, 'All themes achieve WCAG AAA contrast ratio (>= 7.0:1) against white text', lowContrastThemes.map(t => `${t.name} (${computeWcagContrastAgainstWhite(t.color).toFixed(2)}:1)`).join(', '));

console.log('');

// ----------------------------------------------------
// TIER 3: Spectrum Distribution & Bias Elimination
// ----------------------------------------------------
console.log(`${BOLD}${MAGENTA}--- TIER 3: SPECTRUM DISTRIBUTION & BIAS ELIMINATION ---${RESET}`);

// Sector Coverage
const coveredSectors = new Set();
themes.forEach(t => {
  const hsl = rgbToHsl(t.color);
  const sector = getHueSector(hsl.h);
  if (sector !== 'Unknown') {
    coveredSectors.add(sector);
  }
});

console.log(`  ${GRAY}Covered Hue Sectors (${coveredSectors.size}/${HUE_SECTORS.length}):${RESET}`);
HUE_SECTORS.forEach(sec => {
  const isCovered = coveredSectors.has(sec.name);
  const mark = isCovered ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  console.log(`    ${mark} ${sec.name}`);
});

assert(coveredSectors.size >= 6, `Theme palette covers at least 6 distinct hue sectors across the 360° color spectrum (found: ${coveredSectors.size}/6)`, `Missing sectors: ${HUE_SECTORS.filter(s => !coveredSectors.has(s.name)).map(s => s.name).join(', ')}`);

// Blue/Brown Bias Elimination (<= 30%)
const blueBrownThemes = themes.filter(isBlueOrBrown);
const blueBrownRatio = blueBrownThemes.length / themes.length;
const blueBrownPct = (blueBrownRatio * 100).toFixed(1);

console.log(`  ${GRAY}Blue/Brown Classification Count: ${blueBrownThemes.length}/${themes.length} (${blueBrownPct}%)${RESET}`);
if (blueBrownThemes.length > 0) {
  console.log(`    ${GRAY}Classified themes: ${blueBrownThemes.map(t => t.name).join(', ')}${RESET}`);
}

assert(blueBrownRatio <= 0.30, `Blue/Brown themes do not exceed 30% of the total palette (current: ${blueBrownPct}%)`, `Count: ${blueBrownThemes.length}/${themes.length} (${blueBrownPct}% > 30.0%)`);

console.log('');

// ----------------------------------------------------
// TIER 4: Legacy Dark Blue Exact Match
// ----------------------------------------------------
console.log(`${BOLD}${MAGENTA}--- TIER 4: LEGACY DARK BLUE EXACT MATCH ---${RESET}`);

const darkBlueTheme = themes.find(t => t.name === 'Dark Blue');
assert(!!darkBlueTheme, 'A theme with name "Dark Blue" exists in the palette', 'Dark Blue theme missing');

if (darkBlueTheme) {
  const normalizedColor = (darkBlueTheme.color || '').toLowerCase();
  assert(normalizedColor === '#172554', 'Dark Blue color matches legacy value #172554 exactly', `Found: ${darkBlueTheme.color}, Expected: #172554`);
  
  const validIds = ['bg-[#172554]', 'bg-blue-950'];
  const isValidId = validIds.includes(darkBlueTheme.id);
  assert(isValidId, 'Dark Blue id matches "bg-[#172554]" or "bg-blue-950"', `Found: ${darkBlueTheme.id}, Expected one of: ${validIds.join(' or ')}`);
}

console.log('');

// ----------------------------------------------------
// Summary & Verdict
// ----------------------------------------------------
console.log(`${BOLD}${CYAN}====================================================${RESET}`);
console.log(`${BOLD}${CYAN}                   TEST SUMMARY                     ${RESET}`);
console.log(`${BOLD}${CYAN}====================================================${RESET}`);
console.log(`Total Assertions: ${totalTests}`);
console.log(`Passed:           ${GREEN}${passedTests}${RESET}`);
console.log(`Failed:           ${failedTests > 0 ? RED : GREEN}${failedTests}${RESET}`);

if (failedTests > 0) {
  console.log(`\n${BOLD}${RED}FAILED ASSERTIONS (${failedTests}):${RESET}`);
  failures.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.message}${f.details ? ` (${f.details})` : ''}`);
  });
  console.log(`\n${RED}${BOLD}VERDICT: FAILED${RESET}\n`);
  process.exit(1);
} else {
  console.log(`\n${GREEN}${BOLD}VERDICT: ALL TESTS PASSED SUCCESSFULLY${RESET}\n`);
  process.exit(0);
}
