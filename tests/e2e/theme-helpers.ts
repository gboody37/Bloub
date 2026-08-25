/**
 * Shared Theme Verification Helpers, Types & Mathematical Formulas
 * 
 * Provides:
 * - W3C WCAG 2.1 Relative Luminance calculation
 * - WCAG AAA Contrast Ratio against #FFFFFF text
 * - RGB / HSL color conversions
 * - Full spectrum classification (8+ chromatic families)
 * - Source AST / Regex extraction for THEMES array
 */

import fs from 'node:fs';
import path from 'node:path';

export interface ThemeItem {
  id: string;
  name: string;
  color: string;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number; // 0 - 360 degrees
  s: number; // 0 - 1
  l: number; // 0 - 1
}

export type SpectrumFamily = 
  | 'Blue'
  | 'Purple'
  | 'Green'
  | 'Red'
  | 'Amber/Orange'
  | 'Cyan/Teal'
  | 'Rose/Magenta'
  | 'Slate/Monochrome'
  | 'Yellow'
  | 'Unknown';

/**
 * Parses a 6-digit hex color string (#RRGGBB) to numeric RGB components.
 */
export function hexToRgb(hex: string): RGB {
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

/**
 * Calculates W3C WCAG 2.1 relative luminance for an sRGB color.
 * L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin
 * where linear values are gamma-expanded.
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rl, gl, bl] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/**
 * Calculates WCAG 2.1 contrast ratio against white (#FFFFFF, luminance = 1.0).
 * CR = (1.0 + 0.05) / (L + 0.05)
 */
export function getContrastRatioAgainstWhite(lum: number): number {
  return 1.05 / (lum + 0.05);
}

/**
 * Converts RGB components to HSL color space.
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
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
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s, l };
}

/**
 * Classifies a hex color into its primary chromatic spectrum family.
 */
export function classifySpectrumFamily(hex: string): SpectrumFamily {
  const { r, g, b } = hexToRgb(hex);
  const { h, s } = rgbToHsl(r, g, b);

  // Near-achromatic or very low saturation
  if (s < 0.22 || (r === g && g === b)) {
    return 'Slate/Monochrome';
  }

  // Hue based spectral classification
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

/**
 * Extracts THEMES array from src/app/page.tsx.
 */
export function parseThemesFromSource(filePath?: string): ThemeItem[] {
  const targetPath = filePath || path.resolve(process.cwd(), 'src/app/page.tsx');
  if (!fs.existsSync(targetPath)) {
    throw new Error(`File not found: ${targetPath}`);
  }
  const content = fs.readFileSync(targetPath, 'utf8');
  const match = content.match(/(?:export\s+)?const\s+THEMES\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) {
    throw new Error(`Could not locate "const THEMES = [...]" in ${targetPath}`);
  }
  return new Function('return ' + match[1])() as ThemeItem[];
}
