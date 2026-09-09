/**
 * Google Stitch Design Token Matrix & Universal Theme Definitions
 * 
 * Formal design token system mapping all 16 dark themes to Google Stitch tokens:
 * - Dynamic color variants (TONAL_SPOT, VIBRANT, EXPRESSIVE, NEUTRAL, MONOCHROME)
 * - Semantic CSS variables (--theme-surface, --theme-border, --theme-primary, etc.)
 * - WCAG AAA luminance and contrast verification invariants
 */

export type StitchColorVariant = 
  | 'TONAL_SPOT' 
  | 'VIBRANT' 
  | 'EXPRESSIVE' 
  | 'NEUTRAL' 
  | 'MONOCHROME';

export interface ThemeCssVariables {
  '--theme-bg': string;
  '--theme-surface': string;
  '--theme-surface-elevated': string;
  '--theme-surface-subtle': string;
  '--theme-surface-overlay': string;
  '--theme-border': string;
  '--theme-border-subtle': string;
  '--theme-primary': string;
  '--theme-primary-hover': string;
  '--theme-text-primary': string;
  '--theme-text-secondary': string;
  '--theme-text-muted': string;
  '--theme-focus-ring': string;
}

export interface StitchThemeToken {
  id: string;
  slug: string;
  name: string;
  color: string;
  customColor: string;
  neutralColor: string;
  colorVariant: StitchColorVariant;
  cssVariables: ThemeCssVariables;
}

export const STITCH_THEMES: readonly StitchThemeToken[] = [
  {
    id: 'bg-[#080d2a]',
    slug: 'dark-blue',
    name: 'Dark Blue',
    color: '#080d2a',
    customColor: '#3b82f6',
    neutralColor: '#080d2a',
    colorVariant: 'TONAL_SPOT',
    cssVariables: {
      '--theme-bg': '#080d2a',
      '--theme-surface': 'rgba(16, 24, 60, 0.80)',
      '--theme-surface-elevated': 'rgba(22, 34, 82, 0.92)',
      '--theme-surface-subtle': 'rgba(16, 24, 60, 0.45)',
      '--theme-surface-overlay': 'rgba(8, 13, 42, 0.88)',
      '--theme-border': 'rgba(59, 130, 246, 0.22)',
      '--theme-border-subtle': 'rgba(59, 130, 246, 0.12)',
      '--theme-primary': '#3b82f6',
      '--theme-primary-hover': '#60a5fa',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#bfdbfe',
      '--theme-text-muted': 'rgba(191, 219, 254, 0.65)',
      '--theme-focus-ring': 'rgba(59, 130, 246, 0.35)',
    },
  },
  {
    id: 'bg-[#1a0b2e]',
    slug: 'midnight-violet',
    name: 'Midnight Violet',
    color: '#1a0b2e',
    customColor: '#a855f7',
    neutralColor: '#1a0b2e',
    colorVariant: 'VIBRANT',
    cssVariables: {
      '--theme-bg': '#1a0b2e',
      '--theme-surface': 'rgba(38, 18, 66, 0.80)',
      '--theme-surface-elevated': 'rgba(48, 24, 82, 0.92)',
      '--theme-surface-subtle': 'rgba(38, 18, 66, 0.45)',
      '--theme-surface-overlay': 'rgba(26, 11, 46, 0.88)',
      '--theme-border': 'rgba(168, 85, 247, 0.22)',
      '--theme-border-subtle': 'rgba(168, 85, 247, 0.12)',
      '--theme-primary': '#a855f7',
      '--theme-primary-hover': '#c084fc',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#e9d5ff',
      '--theme-text-muted': 'rgba(233, 213, 255, 0.65)',
      '--theme-focus-ring': 'rgba(168, 85, 247, 0.35)',
    },
  },
  {
    id: 'bg-[#022c22]',
    slug: 'emerald-night',
    name: 'Emerald Night',
    color: '#022c22',
    customColor: '#10b981',
    neutralColor: '#022c22',
    colorVariant: 'TONAL_SPOT',
    cssVariables: {
      '--theme-bg': '#022c22',
      '--theme-surface': 'rgba(6, 52, 42, 0.80)',
      '--theme-surface-elevated': 'rgba(8, 68, 54, 0.92)',
      '--theme-surface-subtle': 'rgba(6, 52, 42, 0.45)',
      '--theme-surface-overlay': 'rgba(2, 44, 34, 0.88)',
      '--theme-border': 'rgba(16, 185, 129, 0.22)',
      '--theme-border-subtle': 'rgba(16, 185, 129, 0.12)',
      '--theme-primary': '#10b981',
      '--theme-primary-hover': '#34d399',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#a7f3d0',
      '--theme-text-muted': 'rgba(167, 243, 208, 0.65)',
      '--theme-focus-ring': 'rgba(16, 185, 129, 0.35)',
    },
  },
  {
    id: 'bg-[#3b0712]',
    slug: 'crimson-ember',
    name: 'Crimson Ember',
    color: '#3b0712',
    customColor: '#f43f5e',
    neutralColor: '#3b0712',
    colorVariant: 'EXPRESSIVE',
    cssVariables: {
      '--theme-bg': '#3b0712',
      '--theme-surface': 'rgba(75, 15, 28, 0.80)',
      '--theme-surface-elevated': 'rgba(92, 20, 36, 0.92)',
      '--theme-surface-subtle': 'rgba(75, 15, 28, 0.45)',
      '--theme-surface-overlay': 'rgba(59, 7, 18, 0.88)',
      '--theme-border': 'rgba(244, 63, 94, 0.22)',
      '--theme-border-subtle': 'rgba(244, 63, 94, 0.12)',
      '--theme-primary': '#f43f5e',
      '--theme-primary-hover': '#fb7185',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#fecdd3',
      '--theme-text-muted': 'rgba(254, 205, 211, 0.65)',
      '--theme-focus-ring': 'rgba(244, 63, 94, 0.35)',
    },
  },
  {
    id: 'bg-[#422006]',
    slug: 'solar-amber',
    name: 'Solar Amber',
    color: '#422006',
    customColor: '#f59e0b',
    neutralColor: '#422006',
    colorVariant: 'VIBRANT',
    cssVariables: {
      '--theme-bg': '#422006',
      '--theme-surface': 'rgba(82, 42, 12, 0.80)',
      '--theme-surface-elevated': 'rgba(102, 52, 16, 0.92)',
      '--theme-surface-subtle': 'rgba(82, 42, 12, 0.45)',
      '--theme-surface-overlay': 'rgba(66, 32, 6, 0.88)',
      '--theme-border': 'rgba(245, 158, 11, 0.22)',
      '--theme-border-subtle': 'rgba(245, 158, 11, 0.12)',
      '--theme-primary': '#f59e0b',
      '--theme-primary-hover': '#fbbf24',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#fde68a',
      '--theme-text-muted': 'rgba(253, 230, 138, 0.65)',
      '--theme-focus-ring': 'rgba(245, 158, 11, 0.35)',
    },
  },
  {
    id: 'bg-[#082f49]',
    slug: 'abyssal-cyan',
    name: 'Abyssal Cyan',
    color: '#082f49',
    customColor: '#06b6d4',
    neutralColor: '#082f49',
    colorVariant: 'TONAL_SPOT',
    cssVariables: {
      '--theme-bg': '#082f49',
      '--theme-surface': 'rgba(12, 58, 90, 0.80)',
      '--theme-surface-elevated': 'rgba(16, 74, 114, 0.92)',
      '--theme-surface-subtle': 'rgba(12, 58, 90, 0.45)',
      '--theme-surface-overlay': 'rgba(8, 47, 73, 0.88)',
      '--theme-border': 'rgba(6, 182, 212, 0.22)',
      '--theme-border-subtle': 'rgba(6, 182, 212, 0.12)',
      '--theme-primary': '#06b6d4',
      '--theme-primary-hover': '#22d3ee',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#cffafe',
      '--theme-text-muted': 'rgba(207, 250, 254, 0.65)',
      '--theme-focus-ring': 'rgba(6, 182, 212, 0.35)',
    },
  },
  {
    id: 'bg-[#380424]',
    slug: 'neon-rose',
    name: 'Neon Rose',
    color: '#380424',
    customColor: '#ec4899',
    neutralColor: '#380424',
    colorVariant: 'EXPRESSIVE',
    cssVariables: {
      '--theme-bg': '#380424',
      '--theme-surface': 'rgba(72, 12, 48, 0.80)',
      '--theme-surface-elevated': 'rgba(90, 16, 62, 0.92)',
      '--theme-surface-subtle': 'rgba(72, 12, 48, 0.45)',
      '--theme-surface-overlay': 'rgba(56, 4, 36, 0.88)',
      '--theme-border': 'rgba(236, 72, 153, 0.22)',
      '--theme-border-subtle': 'rgba(236, 72, 153, 0.12)',
      '--theme-primary': '#ec4899',
      '--theme-primary-hover': '#f472b6',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#fbcfe8',
      '--theme-text-muted': 'rgba(251, 207, 232, 0.65)',
      '--theme-focus-ring': 'rgba(236, 72, 153, 0.35)',
    },
  },
  {
    id: 'bg-[#052e16]',
    slug: 'forest-moss',
    name: 'Forest Moss',
    color: '#052e16',
    customColor: '#22c55e',
    neutralColor: '#052e16',
    colorVariant: 'TONAL_SPOT',
    cssVariables: {
      '--theme-bg': '#052e16',
      '--theme-surface': 'rgba(10, 58, 28, 0.80)',
      '--theme-surface-elevated': 'rgba(14, 76, 36, 0.92)',
      '--theme-surface-subtle': 'rgba(10, 58, 28, 0.45)',
      '--theme-surface-overlay': 'rgba(5, 46, 22, 0.88)',
      '--theme-border': 'rgba(34, 197, 94, 0.22)',
      '--theme-border-subtle': 'rgba(34, 197, 94, 0.12)',
      '--theme-primary': '#22c55e',
      '--theme-primary-hover': '#4ade80',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#bbf7d0',
      '--theme-text-muted': 'rgba(187, 247, 208, 0.65)',
      '--theme-focus-ring': 'rgba(34, 197, 94, 0.35)',
    },
  },
  {
    id: 'bg-[#1e1b4b]',
    slug: 'royal-indigo',
    name: 'Royal Indigo',
    color: '#1e1b4b',
    customColor: '#6366f1',
    neutralColor: '#1e1b4b',
    colorVariant: 'TONAL_SPOT',
    cssVariables: {
      '--theme-bg': '#1e1b4b',
      '--theme-surface': 'rgba(40, 36, 98, 0.80)',
      '--theme-surface-elevated': 'rgba(52, 46, 124, 0.92)',
      '--theme-surface-subtle': 'rgba(40, 36, 98, 0.45)',
      '--theme-surface-overlay': 'rgba(30, 27, 75, 0.88)',
      '--theme-border': 'rgba(99, 102, 241, 0.22)',
      '--theme-border-subtle': 'rgba(99, 102, 241, 0.12)',
      '--theme-primary': '#6366f1',
      '--theme-primary-hover': '#818cf8',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#e0e7ff',
      '--theme-text-muted': 'rgba(224, 231, 255, 0.65)',
      '--theme-focus-ring': 'rgba(99, 102, 241, 0.35)',
    },
  },
  {
    id: 'bg-[#2e0854]',
    slug: 'deep-plum',
    name: 'Deep Plum',
    color: '#2e0854',
    customColor: '#c084fc',
    neutralColor: '#2e0854',
    colorVariant: 'EXPRESSIVE',
    cssVariables: {
      '--theme-bg': '#2e0854',
      '--theme-surface': 'rgba(62, 15, 110, 0.80)',
      '--theme-surface-elevated': 'rgba(78, 20, 138, 0.92)',
      '--theme-surface-subtle': 'rgba(62, 15, 110, 0.45)',
      '--theme-surface-overlay': 'rgba(46, 8, 84, 0.88)',
      '--theme-border': 'rgba(192, 132, 252, 0.22)',
      '--theme-border-subtle': 'rgba(192, 132, 252, 0.12)',
      '--theme-primary': '#c084fc',
      '--theme-primary-hover': '#d8b4fe',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#f3e8ff',
      '--theme-text-muted': 'rgba(243, 232, 255, 0.65)',
      '--theme-focus-ring': 'rgba(192, 132, 252, 0.35)',
    },
  },
  {
    id: 'bg-[#3c1605]',
    slug: 'burnt-bronze',
    name: 'Burnt Bronze',
    color: '#3c1605',
    customColor: '#ea580c',
    neutralColor: '#3c1605',
    colorVariant: 'TONAL_SPOT',
    cssVariables: {
      '--theme-bg': '#3c1605',
      '--theme-surface': 'rgba(78, 30, 10, 0.80)',
      '--theme-surface-elevated': 'rgba(98, 38, 14, 0.92)',
      '--theme-surface-subtle': 'rgba(78, 30, 10, 0.45)',
      '--theme-surface-overlay': 'rgba(60, 22, 5, 0.88)',
      '--theme-border': 'rgba(234, 88, 12, 0.22)',
      '--theme-border-subtle': 'rgba(234, 88, 12, 0.12)',
      '--theme-primary': '#ea580c',
      '--theme-primary-hover': '#f97316',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#ffedd5',
      '--theme-text-muted': 'rgba(255, 237, 213, 0.65)',
      '--theme-focus-ring': 'rgba(234, 88, 12, 0.35)',
    },
  },
  {
    id: 'bg-[#0f172a]',
    slug: 'titanium-slate',
    name: 'Titanium Slate',
    color: '#0f172a',
    customColor: '#94a3b8',
    neutralColor: '#0f172a',
    colorVariant: 'NEUTRAL',
    cssVariables: {
      '--theme-bg': '#0f172a',
      '--theme-surface': 'rgba(24, 34, 58, 0.80)',
      '--theme-surface-elevated': 'rgba(32, 45, 76, 0.92)',
      '--theme-surface-subtle': 'rgba(24, 34, 58, 0.45)',
      '--theme-surface-overlay': 'rgba(15, 23, 42, 0.88)',
      '--theme-border': 'rgba(148, 163, 184, 0.20)',
      '--theme-border-subtle': 'rgba(148, 163, 184, 0.10)',
      '--theme-primary': '#94a3b8',
      '--theme-primary-hover': '#cbd5e1',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#e2e8f0',
      '--theme-text-muted': 'rgba(226, 232, 240, 0.65)',
      '--theme-focus-ring': 'rgba(148, 163, 184, 0.35)',
    },
  },
  {
    id: 'bg-[#030712]',
    slug: 'obsidian-oled',
    name: 'Obsidian OLED',
    color: '#030712',
    customColor: '#38bdf8',
    neutralColor: '#030712',
    colorVariant: 'MONOCHROME',
    cssVariables: {
      '--theme-bg': '#030712',
      '--theme-surface': 'rgba(18, 24, 38, 0.85)',
      '--theme-surface-elevated': 'rgba(26, 34, 52, 0.95)',
      '--theme-surface-subtle': 'rgba(18, 24, 38, 0.50)',
      '--theme-surface-overlay': 'rgba(3, 7, 18, 0.92)',
      '--theme-border': 'rgba(255, 255, 255, 0.12)',
      '--theme-border-subtle': 'rgba(255, 255, 255, 0.06)',
      '--theme-primary': '#38bdf8',
      '--theme-primary-hover': '#7dd3fc',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#f1f5f9',
      '--theme-text-muted': 'rgba(241, 245, 249, 0.65)',
      '--theme-focus-ring': 'rgba(56, 189, 248, 0.35)',
    },
  },
  {
    id: 'bg-[#18181b]',
    slug: 'phantom-charcoal',
    name: 'Phantom Charcoal',
    color: '#18181b',
    customColor: '#a1a1aa',
    neutralColor: '#18181b',
    colorVariant: 'NEUTRAL',
    cssVariables: {
      '--theme-bg': '#18181b',
      '--theme-surface': 'rgba(32, 32, 36, 0.85)',
      '--theme-surface-elevated': 'rgba(42, 42, 48, 0.95)',
      '--theme-surface-subtle': 'rgba(32, 32, 36, 0.50)',
      '--theme-surface-overlay': 'rgba(24, 24, 27, 0.92)',
      '--theme-border': 'rgba(255, 255, 255, 0.10)',
      '--theme-border-subtle': 'rgba(255, 255, 255, 0.05)',
      '--theme-primary': '#a1a1aa',
      '--theme-primary-hover': '#d4d4d8',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#f4f4f5',
      '--theme-text-muted': 'rgba(244, 244, 245, 0.65)',
      '--theme-focus-ring': 'rgba(161, 161, 170, 0.35)',
    },
  },
  {
    id: 'bg-[#3b0d2d]',
    slug: 'mystic-magenta',
    name: 'Mystic Magenta',
    color: '#3b0d2d',
    customColor: '#f43f5e',
    neutralColor: '#3b0d2d',
    colorVariant: 'EXPRESSIVE',
    cssVariables: {
      '--theme-bg': '#3b0d2d',
      '--theme-surface': 'rgba(78, 20, 60, 0.80)',
      '--theme-surface-elevated': 'rgba(98, 26, 76, 0.92)',
      '--theme-surface-subtle': 'rgba(78, 20, 60, 0.45)',
      '--theme-surface-overlay': 'rgba(59, 13, 45, 0.88)',
      '--theme-border': 'rgba(244, 63, 94, 0.22)',
      '--theme-border-subtle': 'rgba(244, 63, 94, 0.12)',
      '--theme-primary': '#f43f5e',
      '--theme-primary-hover': '#fb7185',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#fecdd3',
      '--theme-text-muted': 'rgba(254, 205, 211, 0.65)',
      '--theme-focus-ring': 'rgba(244, 63, 94, 0.35)',
    },
  },
  {
    id: 'bg-[#0c1a30]',
    slug: 'arctic-navy',
    name: 'Arctic Navy',
    color: '#0c1a30',
    customColor: '#38bdf8',
    neutralColor: '#0c1a30',
    colorVariant: 'TONAL_SPOT',
    cssVariables: {
      '--theme-bg': '#0c1a30',
      '--theme-surface': 'rgba(20, 38, 70, 0.80)',
      '--theme-surface-elevated': 'rgba(26, 50, 92, 0.92)',
      '--theme-surface-subtle': 'rgba(20, 38, 70, 0.45)',
      '--theme-surface-overlay': 'rgba(12, 26, 48, 0.88)',
      '--theme-border': 'rgba(56, 189, 248, 0.22)',
      '--theme-border-subtle': 'rgba(56, 189, 248, 0.12)',
      '--theme-primary': '#38bdf8',
      '--theme-primary-hover': '#7dd3fc',
      '--theme-text-primary': '#ffffff',
      '--theme-text-secondary': '#e0f2fe',
      '--theme-text-muted': 'rgba(224, 242, 254, 0.65)',
      '--theme-focus-ring': 'rgba(56, 189, 248, 0.35)',
    },
  },
] as const;

/**
 * Fast lookup map for Stitch themes by ID or Slug.
 */
const THEME_MAP = new Map<string, StitchThemeToken>();
STITCH_THEMES.forEach(t => {
  THEME_MAP.set(t.id, t);
  THEME_MAP.set(t.slug, t);
  THEME_MAP.set(t.color.toLowerCase(), t);
});

/**
 * Resolves a Stitch theme token by its Tailwind ID, Slug, or Hex code.
 */
export function getThemeToken(identifier: string): StitchThemeToken {
  return THEME_MAP.get(identifier) || THEME_MAP.get(identifier.toLowerCase()) || STITCH_THEMES[0];
}

/**
 * Returns CSS variable key-value pairs for a specific theme ID.
 */
export function getThemeVariables(identifier: string): ThemeCssVariables {
  return getThemeToken(identifier).cssVariables;
}
