# Visual Design Proposals & Google Stitch Token Architecture

> **Document Version**: 1.0.0 (Pre-Implementation Concept Sign-Off)  
> **Project**: Vibe Todos Creative Engineering Overhaul  
> **Milestone**: M1 (Stitch Design Integration & Universal Theme Remodeling)  
> **Status**: APPROVED FOR IMPLEMENTATION  
> **Design Frameworks**: Google Stitch Design System + `ui-ux-architect` Standards  
> **Target Workspace**: `d:\AI\جبنة\vibe-todos`  

---

## 1. Executive Vision & Design Philosophy

The Vibe Todos creative overhaul eliminates generic, low-effort "AI slop" aesthetics—such as muddy gray backgrounds, repetitive floating cards with generic `shadow-md`, and purple gradient cliches—in favor of disciplined, high-contrast, human-grade product craft inspired by Linear, Raycast, Notion, Arc, and Apple Human Interface Guidelines.

### Core Aesthetic Axioms:
1. **High-Contrast Deep Baselines**: Pure, rich dark neutral baselines with distinct spectral undertones (`#080d2a` Dark Blue, `#022c22` Emerald Night, `#3b0712` Crimson Ember, `#030712` Obsidian OLED) paired with subtle 1px border separation (`border-white/[0.08]` or semantic `rgba` borders).
2. **Single Dominant Accent**: Restricting dynamic color to one deliberate brand accent per active theme, reserved strictly for primary calls-to-action, active selection states, and interactive feedback. Secondary elements remain neutral, calm, and legible.
3. **Intentional 4px/8px Modular Rhythm**: Strict dimensional rhythm for padding, margins, gaps, and heights (`p-2`, `p-4`, `p-6`, `gap-3`, `gap-6`, `h-13`).
4. **Fluid Viewport Immersion (100dvh)**: The Study Tab recovers >200px of vertical headroom by collapsing stacked navigation bars into a single unified dynamic island, delivering an edge-to-edge reading canvas with floating ergonomic docks.
5. **Universal Theme Reactivity**: Eliminating all hardcoded `slate-800`, `slate-900`, and `#12141c` component colors so that every panel, drawer, button, and card smoothly and synchronously morphs with the user's active theme.

---

## 2. Google Stitch 16-Theme Token Matrix

Every theme is formally mapped to Google Stitch design token semantics, pairing primary dynamic seeds, neutral baselines, elevation surfaces, and color variants while strictly maintaining **WCAG AAA contrast (> 7:1 against #FFFFFF)** and Relative Luminance $L \le 0.20$.

| # | Theme Name | Tailwind ID (`id`) | Background (`--theme-bg`) | Stitch Primary Seed (`--theme-primary`) | Stitch Surface (`--theme-surface`) | Stitch Surface Elevated (`--theme-surface-elevated`) | Stitch Border Subtle (`--theme-border`) | Stitch Variant | Luminance ($L$) | Contrast (#FFF) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Dark Blue** | `bg-[#080d2a]` | `#080d2a` | `#3b82f6` (Sapphire) | `rgba(16, 24, 60, 0.80)` | `rgba(22, 34, 82, 0.92)` | `rgba(59, 130, 246, 0.22)` | `TONAL_SPOT` | 0.0051 | 19.07:1 (AAA) |
| 2 | **Midnight Violet** | `bg-[#1a0b2e]` | `#1a0b2e` | `#a855f7` (Violet) | `rgba(38, 18, 66, 0.80)` | `rgba(48, 24, 82, 0.92)` | `rgba(168, 85, 247, 0.22)` | `VIBRANT` | 0.0066 | 18.56:1 (AAA) |
| 3 | **Emerald Night** | `bg-[#022c22]` | `#022c22` | `#10b981` (Emerald) | `rgba(6, 52, 42, 0.80)` | `rgba(8, 68, 54, 0.92)` | `rgba(16, 185, 129, 0.22)` | `TONAL_SPOT` | 0.0193 | 15.15:1 (AAA) |
| 4 | **Crimson Ember** | `bg-[#3b0712]` | `#3b0712` | `#f43f5e` (Rose) | `rgba(75, 15, 28, 0.80)` | `rgba(92, 20, 36, 0.92)` | `rgba(244, 63, 94, 0.22)` | `EXPRESSIVE` | 0.0113 | 17.14:1 (AAA) |
| 5 | **Solar Amber** | `bg-[#422006]` | `#422006` | `#f59e0b` (Amber) | `rgba(82, 42, 12, 0.80)` | `rgba(102, 52, 16, 0.92)` | `rgba(245, 158, 11, 0.22)` | `VIBRANT` | 0.0220 | 14.57:1 (AAA) |
| 6 | **Abyssal Cyan** | `bg-[#082f49]` | `#082f49` | `#06b6d4` (Cyan) | `rgba(12, 58, 90, 0.80)` | `rgba(16, 74, 114, 0.92)` | `rgba(6, 182, 212, 0.22)` | `TONAL_SPOT` | 0.0257 | 13.88:1 (AAA) |
| 7 | **Neon Rose** | `bg-[#380424]` | `#380424` | `#ec4899` (Pink) | `rgba(72, 12, 48, 0.80)` | `rgba(90, 16, 62, 0.92)` | `rgba(236, 72, 153, 0.22)` | `EXPRESSIVE` | 0.0105 | 17.34:1 (AAA) |
| 8 | **Forest Moss** | `bg-[#052e16]` | `#052e16` | `#22c55e` (Green) | `rgba(10, 58, 28, 0.80)` | `rgba(14, 76, 36, 0.92)` | `rgba(34, 197, 94, 0.22)` | `TONAL_SPOT` | 0.0204 | 14.91:1 (AAA) |
| 9 | **Royal Indigo** | `bg-[#1e1b4b]` | `#1e1b4b` | `#6366f1` (Indigo) | `rgba(40, 36, 98, 0.80)` | `rgba(52, 46, 124, 0.92)` | `rgba(99, 102, 241, 0.22)` | `TONAL_SPOT` | 0.0157 | 15.99:1 (AAA) |
| 10 | **Deep Plum** | `bg-[#2e0854]` | `#2e0854` | `#c084fc` (Plum) | `rgba(62, 15, 110, 0.80)` | `rgba(78, 20, 138, 0.92)` | `rgba(192, 132, 252, 0.22)` | `EXPRESSIVE` | 0.0139 | 16.42:1 (AAA) |
| 11 | **Burnt Bronze** | `bg-[#3c1605]` | `#3c1605` | `#ea580c` (Bronze) | `rgba(78, 30, 10, 0.80)` | `rgba(98, 38, 14, 0.92)` | `rgba(234, 88, 12, 0.22)` | `TONAL_SPOT` | 0.0155 | 16.04:1 (AAA) |
| 12 | **Titanium Slate** | `bg-[#0f172a]` | `#0f172a` | `#94a3b8` (Slate) | `rgba(24, 34, 58, 0.80)` | `rgba(32, 45, 76, 0.92)` | `rgba(148, 163, 184, 0.20)` | `NEUTRAL` | 0.0088 | 17.85:1 (AAA) |
| 13 | **Obsidian OLED** | `bg-[#030712]` | `#030712` | `#38bdf8` (Electric Sky)| `rgba(18, 24, 38, 0.85)` | `rgba(26, 34, 52, 0.95)` | `rgba(255, 255, 255, 0.12)` | `MONOCHROME` | 0.0021 | 20.13:1 (AAA) |
| 14 | **Phantom Charcoal**| `bg-[#18181b]` | `#18181b` | `#a1a1aa` (Zinc) | `rgba(32, 32, 36, 0.85)` | `rgba(42, 42, 48, 0.95)` | `rgba(255, 255, 255, 0.10)` | `NEUTRAL` | 0.0093 | 17.72:1 (AAA) |
| 15 | **Mystic Magenta** | `bg-[#3b0d2d]` | `#3b0d2d` | `#f43f5e` (Magenta) | `rgba(78, 20, 60, 0.80)` | `rgba(98, 26, 76, 0.92)` | `rgba(244, 63, 94, 0.22)` | `EXPRESSIVE` | 0.0141 | 16.39:1 (AAA) |
| 16 | **Arctic Navy** | `bg-[#0c1a30]` | `#0c1a30` | `#38bdf8` (Ice Sky) | `rgba(20, 38, 70, 0.80)` | `rgba(26, 50, 92, 0.92)` | `rgba(56, 189, 248, 0.22)` | `TONAL_SPOT` | 0.0103 | 17.41:1 (AAA) |

---

## 3. Dynamic CSS Variable Architecture (`globals.css`)

To bridge the runtime mismatch where `setAttribute('data-theme', bgTheme)` assigns `data-theme="bg-[#...]"` while CSS rules previously targeted semantic names (`darkBlue`, `zinc`), the CSS architecture establishes **dual-selector bindings** for every theme.

### Canonical Token Definitions:
```css
/* Example definition for Emerald Night */
[data-theme="bg-[#022c22]"],
[data-theme="emerald-night"] {
  --theme-bg: #022c22;
  --theme-surface: rgba(6, 52, 42, 0.80);
  --theme-surface-elevated: rgba(8, 68, 54, 0.92);
  --theme-surface-subtle: rgba(6, 52, 42, 0.45);
  --theme-surface-overlay: rgba(2, 44, 34, 0.88);
  --theme-border: rgba(16, 185, 129, 0.22);
  --theme-border-subtle: rgba(16, 185, 129, 0.12);
  --theme-primary: #10b981;
  --theme-primary-hover: #34d399;
  --theme-text-primary: #ffffff;
  --theme-text-secondary: #a7f3d0;
  --theme-text-muted: rgba(167, 243, 208, 0.65);
  --theme-focus-ring: rgba(16, 185, 129, 0.35);
}
```

### Universal Utility Classes:
- `.theme-surface`: Standard backdrop-blurred container surface (`bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-text-primary)] backdrop-blur-xl`).
- `.theme-surface-elevated`: Floating modals, docks, and header pills (`bg-[var(--theme-surface-elevated)] border-[var(--theme-border)] shadow-2xl`).
- `.theme-surface-subtle`: Inset rows, search inputs, and inactive tabs (`bg-[var(--theme-surface-subtle)] border-[var(--theme-border-subtle)]`).
- `.theme-btn-primary`: Dynamic primary action button with tactile press states (`bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] active:scale-[0.98] transition-all duration-150`).

---

## 4. Typography Scale & Font Pairings

Following the `ui-ux-architect` standard, typography balances razor-sharp digital interfaces with warm, human handwriting commentary.

| Level | Font Family | Size | Weight | Tracking | Line Height | Usage |
|---|---|---|---|---|---|---|
| **Display / Title** | Geist Sans (`--font-sans`) | 24px - 30px | 700 (Bold) | `-0.03em` (`tracking-tight`) | 1.2 | Note titles, quiz hero headers |
| **Heading 2** | Geist Sans (`--font-sans`) | 18px - 20px | 600 (Semibold) | `-0.02em` | 1.3 | Panel section headers, quiz questions |
| **Body Primary** | Geist Sans (`--font-sans`) | 14px - 15px | 400 (Regular) | `0em` | 1.5 | General text, note explorer cards |
| **Subtext / Meta** | Geist Sans (`--font-sans`) | 11px - 12px | 500 (Medium) | `0.02em` | 1.4 | Badges, timestamps, status labels |
| **Data / Tabular** | Geist Mono (`--font-mono`) | 12px - 13px | 500 (Medium) | `0.01em` (`tabular-nums`) | 1.0 | Page counters (e.g. `1 / 14`), stats |
| **English Notes** | Caveat (`--font-caveat`) | 24px - 26px | 600 (Semibold) | `0.02em` | 32px | Handwritten handwriting margin notes |
| **Arabic Notes** | Lemonada (`--font-lemonada`)| 16px - 18px | 500 (Medium) | `0em` | 32px | Arabic RTL commentary in NotesPanel |

---

## 5. Study Tab 100dvh Layout Wireframes & Viewport Ergonomics

### Problem Solved:
Previously, `NoteViewer.tsx` stacked a top navigation bar (56px), an expansive Note Info Card (~150px), and a secondary PDF toolbar (~50px), consuming **>256px of vertical height** before the document canvas even started.

### Proposed Architecture:
```
+---------------------------------------------------------------------------------------------------+
| [Unified Dynamic Island Top Bar — h-13 (52px)]                                                     |
| [<- Back]  "Advanced Quantum Notes" [Ar/En]  |  [Pan] [Select] [Highlighter] [Text] [Eraser] [Undo]  |  [TOC] [Notes] [Quiz] [Full] |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  <Slide-Over TOC>          |                     [CENTRAL READING VIEWPORT]                    | <Collapsible Notes> |
|  (Auto-Hiding Left Drawer) |                                                                   | (Right 3-State Panel)|
|                            |   +-----------------------------------------------------------+   |                     |
|  - Chapter 1: Foundations  |   |                                                           |   | [Pg. 1 Notes]       |
|    * Wavepacket Dispersion |   |                     PDF DOCUMENT CANVAS                   |   | [English (Caveat)]  |
|    * Eigenstate Calculus   |   |                  (ArabicTextLayer Selection)              |   |                     |
|  - Chapter 2: Hamiltonians |   |                  (Spatial Annotation Overlay)             |   | - Key equations:    |
|    * Perturbation Theory   |   |                                                           |   |   H|ψ> = E|ψ>       |
|                            |   |                                                           |   |                     |
|                            |   |                                                           |   |                     |
|                            |   +-----------------------------------------------------------+   |                     |
|                            |                                                                   |                     |
|                            |   +-----------------------------------------------------------+   |                     |
|                            |   | [Floating Glassmorphic Pagination Dock]                   |   |                     |
|                            |   | [ < Prev ]   Page [ 1 ] of 14   [ Next > ]  | [ - ] 100% [ + ]|   |                     |
|                            |   +-----------------------------------------------------------+   |                     |
+---------------------------------------------------------------------------------------------------+
```

### Structural Highlights:
1. **Unified Dynamic Island Top Bar (`h-13`)**:
   - Merges navigation, document title, annotation tools, and mode toggles into a single 52px floating bar.
   - Saves **over 200px of vertical space**, immediately revealing document content on first load.
2. **Three-State Responsive NotesPanel**:
   - **Expanded (`w-[400px]` - `w-[520px]`)**: Fluid drag-to-resize, theme-reactive surface (`--theme-surface`), notebook ruling lines tinted to the active accent.
   - **Compact Icon Rail (`w-12` / 48px)**: Collapsed vertical strip displaying note badge indicators, expanding on click with spring animation.
   - **Hidden (Tablet/Mobile)**: Completely hidden off-screen to preserve 100% reading viewport on smaller devices.
3. **Floating Pagination Dock (`fixed bottom-5 left-1/2 -translate-x-1/2`)**:
   - High-contrast, tactile pill dock (`--theme-surface-elevated` + `--theme-border`).
   - Touch-first ergonomics with min 44x44px clickable target areas.
4. **Fluid Dual-Pane Quiz Mode**:
   - In AI Quiz mode, dynamically splits viewport into Left (58% PDF Viewer) and Right (42% Quiz Session) without fixed `min-h-[780px]` clipping.

---

## 6. Theme Reactivity in NotesPanel & QuizSession

### NotesPanel.tsx Replacements:
| Location | Old Hardcoded Style | New Theme-Reactive Style | Purpose |
|---|---|---|---|
| Panel Root (`line 109`) | `border-slate-800 bg-[#12141c]` | `border-[var(--theme-border)] bg-[var(--theme-surface)] backdrop-blur-xl` | Adapts notebook background to theme hue |
| Header Strip (`line 114`) | `border-slate-800 bg-slate-900` | `border-[var(--theme-border)] bg-[var(--theme-surface-elevated)]` | Header contrasts with note canvas |
| Lang Picker (`line 127`) | `bg-slate-800 border-slate-700 text-slate-300` | `bg-[var(--theme-surface-subtle)] border-[var(--theme-border)] text-[var(--theme-text-secondary)]` | Font selector matches theme surface |
| Text Color (`line 148`) | `text-amber-100/90 placeholder:text-amber-100/20` | `text-[var(--theme-text-primary)] placeholder:[var(--theme-text-muted)]` | Handwriting legible on all 16 themes |
| Ruled Lines (`line 153`) | `rgba(167, 139, 250, 0.15)` | `var(--theme-border-subtle)` | Dynamic notebook ruling matches theme accent |

### QuizSession.tsx Replacements:
| Location | Old Hardcoded Style | New Theme-Reactive Style | Purpose |
|---|---|---|---|
| Header & Borders (`line 209`) | `border-slate-800` | `border-[var(--theme-border)]` | Quiz frame matches active theme borders |
| Progress Ticks (`line 216`) | `isDark ? 'bg-slate-800' : 'bg-gray-200'` | `bg-[var(--theme-surface-subtle)]` | Question step indicators match theme surface |
| Option Cards (`line 249`) | `bg-slate-800/50 hover:bg-slate-800 border-transparent` | `bg-[var(--theme-surface-subtle)] hover:bg-[var(--theme-surface-elevated)] border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)]` | Quiz options adopt theme-colored glass surfaces |
| Short Answer Input (`line 276`)| `bg-slate-800/50 border-slate-700 focus:border-purple-500` | `bg-[var(--theme-surface-subtle)] border-[var(--theme-border)] focus:border-[var(--theme-primary)]` | Text input matches theme palette |
| Complete Screen (`line 195`)| `bg-slate-800 hover:bg-slate-700` | `bg-[var(--theme-surface-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border)]` | Action button adapts to theme |

---

## 7. Concept Sign-Off & Verification Plan

- **WCAG AAA Contrast**: All 16 themes verified $\ge 7:1$ contrast against `#FFFFFF`.
- **Selector Parity**: Every theme possesses both `[data-theme="bg-[#...]"]` and semantic alias selectors in `globals.css`.
- **Zero Data Loss Contract**: No modification to storage engines, Supabase calls, or WAL pipelines.
- **Verification Harness**: `node --experimental-strip-types tests/verification/verify-theme-redesign.ts` must pass 100% (4/4 acceptance criteria).

---
*Signed off by*: Stitch Design & Universal Theme Worker (Milestone M1)
