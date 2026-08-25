# Vibe Todos — Theme Redesign Specification & Requirements Document

## Executive Summary
This document specifies the complete requirements, constraints, interface contracts, palette spectrum, and verification criteria for the **Vibe Todos Dark Theme Redesign**. The objective is to overhaul the custom color themes to eliminate over-representation of generic blue/brown variants and provide at least 12 distinct, vibrant, purely dark themes spanning the entire color spectrum, while faithfully preserving and restoring the legacy "Dark Blue" theme.

---

## 1. Authoritative Requirements & Traceability

### R1. Diverse Theme Palette Overhaul
- **Requirement Statement**: The application's theme list (`THEMES` array in `src/app/page.tsx`) must be overhauled to provide a vibrant, distinct set of purely dark themes spanning the complete color spectrum.
- **Source**: `ORIGINAL_REQUEST.md` §R1 (2026-08-25T03:25:17Z & 2026-08-25T07:02:12Z)
- **Key Rules**:
  - **Darkness Rule**: Every theme must be a dark theme with low background luminance ($L \le 20\%$) to ensure high contrast against white and light text (`text-white`, `text-slate-200`, `text-slate-300`).
  - **Vibrancy Rule**: Themes must possess sufficient chroma/saturation in their respective color hue so each theme has an unmistakable color identity, avoiding muddy or washed-out brown/gray blends.
  - **Full Spectrum Coverage**: Themes must cover all major chromatic sectors: Red, Orange/Amber, Yellow/Chartreuse, Green/Emerald, Cyan/Teal, Blue/Navy, Purple/Indigo, Magenta/Pink, Warm Mocha, Charcoal/Slate, Pitch Black/OLED, and Synthwave/Neon.
  - **Minimum Count**: The `THEMES` array must contain **at least 12 distinct themes**.

### R2. Legacy "Dark Blue" Theme Restoration & Preservation
- **Requirement Statement**: The original "Dark Blue" theme must be perfectly recreated/retained and included in the updated `THEMES` list.
- **Source**: `ORIGINAL_REQUEST.md` §R2
- **Key Rules**:
  - Must include `Classic Dark Blue` / `Dark Blue` with the authoritative dark blue background (e.g., `bg-[#0f172a]` or `bg-[#080d2a]`).
  - Must accurately reflect the aesthetic of the classic Vibe Todos dark blue palette.
  - Must serve as a stable default/fallback theme for new and existing sessions.

---

## 2. Technical Interface Contracts & Architecture

### 2.1 Theme Definition Schema
In `src/app/page.tsx`, the `THEMES` constant must adhere to the following TypeScript interface:
```typescript
interface ThemeItem {
  id: string;      // Tailwind arbitrary class, e.g. 'bg-[#0f172a]'
  name: string;    // User-facing display title, e.g. 'Classic Dark Blue'
  color: string;   // Hex color code, e.g. '#0f172a' (used for swatches & meta theme-color)
}
```

### 2.2 UI System & Glassmorphism Integration
- **Overlay Contract (`tc`)**:
  All UI cards and interactive components utilize translucent glassy overlays:
  - `card`: `'bg-black/20 border border-white/10 hover:border-white/20 hover:bg-black/30 backdrop-blur-md text-white'`
  - `cardMuted`: `'bg-black/40 border-black/50 backdrop-blur-md text-slate-300'`
  - `nav`: `'bg-black/40 border-t border-white/5 backdrop-blur-xl'`
  - `input`: `'bg-black/30 border-white/10 text-white placeholder-white/40 focus:border-white/30 backdrop-blur-md'`
- **Root & Header Binding**:
  - Page wrapper: `<div className={"min-h-screen w-full " + bgTheme + " transition-colors duration-500 font-sans"}>`
  - Sticky header: `<header className={"pt-12 pb-6 px-6 relative z-30 flex justify-between items-center border-b transition-colors duration-500 " + bgTheme + " " + (isDark ? "border-slate-800" : "border-gray-200/30")}>`
  - Meta tag synchronization: `<meta name="theme-color" content={activeTheme.color} />`
  - HTML root dark mode class: `document.documentElement.classList.add('dark')` and `data-theme={bgTheme}`.

### 2.3 Persistence & Cross-Device Sync Contract
- **Local Storage Key**: `${userId}_bgTheme` stores the active theme `id` string (e.g. `'bg-[#0f172a]'`).
- **Supabase User Metadata**: `user_metadata.bgTheme` stores the active theme `id`.
- **FOUC Prevention Script**: In `src/app/layout.tsx`, inline script checks `localStorage` on initial document load and applies dark classes before DOM mount.
- **Graceful Fallback**: If a stored theme ID does not match any current theme, the application must fall back gracefully to the first theme or default theme (`Classic Dark Blue` / `bg-[#0f172a]`).

---

## 3. Full Spectrum Palette Specification (Target Matrix: >= 12 Themes)

The redesigned palette spans all major spectral domains:

| # | Spectrum Domain | Theme Name | Suggested ID | Hex Color | Aesthetic & Character |
|---|-----------------|------------|--------------|-----------|------------------------|
| 1 | **Classic Dark Navy** | Classic Dark Blue | `bg-[#0f172a]` | `#0f172a` | Authoritative legacy Dark Blue, crisp deep navy |
| 2 | **Mocha / Warm Dark** | Mocha | `bg-[#1e1e2e]` | `#1e1e2e` | Soft Catppuccin-inspired dark coffee/lavender undertone |
| 3 | **Deep Crimson / Red** | Deep Crimson | `bg-[#2a0a18]` | `#2a0a18` | Rich vampire crimson / ruby red depth |
| 4 | **Emerald / Forest Green** | Emerald Shadow | `bg-[#0a2a1a]` | `#0a2a1a` | Deep jade / forest emerald tone |
| 5 | **Neon Purple / Violet** | Neon Purple | `bg-[#1a0a2a]` | `#1a0a2a` | Vivid electric violet night |
| 6 | **Cyan / Deep Teal** | Midnight Cyan | `bg-[#0a1a2a]` | `#0a1a2a` | Deep arctic oceanic cyan |
| 7 | **Gold / Amber Obsidian** | Gold Obsidian | `bg-[#2a1a0a]` | `#2a1a0a` | Warm dark amber and golden ember |
| 8 | **Magenta / Velvet** | Sunset Velvet | `bg-[#2a0a2a]` | `#2a0a2a` | Deep magenta / twilight royal velvet |
| 9 | **Cyberpunk / Ultra Dark** | Cyberpunk Neon | `bg-[#090514]` | `#090514` | Ultra-deep synthwave base |
| 10 | **Dracula / Charcoal** | Dracula | `bg-[#282a36]` | `#282a36` | Classic gothic charcoal with purple tint |
| 11 | **Pitch Black / OLED** | Pitch Black | `bg-[#111111]` | `#111111` | Pure minimal OLED true dark |
| 12 | **Sakura / Rose Night** | Sakura Night | `bg-[#1e1525]` | `#1e1525` | Romantic dark cherry blossom / rose gold night |
| 13 | **Toxic / Lime Glow** | Toxic Lime | `bg-[#0d2611]` | `#0d2611` | Vibrant neon radioactive green shadow |
| 14 | **Electric Cobalt** | Royal Abyss | `bg-[#0a1232]` | `#0a1232` | Intense sapphire cobalt midnight |

---

## 4. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Theme Selection | Palette Theme Switcher | Allows user to select active app theme from Settings tab | User click on theme button | Updates `bgTheme` state, UI background, and theme-color meta tag | Falls back to default theme if invalid | `src/app/page.tsx:1335` |
| 2 | Theme Persistence | LocalStorage Sync | Saves chosen theme per-user in local storage | `bgTheme` state change | `localStorage.setItem('${uid}_bgTheme', bgTheme)` | Ignores storage quota errors silently | `src/app/page.tsx:360` |
| 3 | Theme Cloud Sync | Supabase Metadata Sync | Syncs chosen theme to Supabase user metadata for multi-device sync | `bgTheme` state change | `supabase.auth.updateUser({ data: { bgTheme } })` | Caught with `console.error` | `src/app/page.tsx:363` |
| 4 | Anti-FOUC | Inline Layout Theme Bootstrapper | Pre-hydrates dark mode and data-theme from localStorage before React mounts | LocalStorage keys ending in `_bgTheme` | Sets `document.documentElement` class `dark` and `data-theme` | Defaults to 'midnight' on error | `src/app/layout.tsx:43` |
| 5 | Mobile Integration | Dynamic Meta Theme-Color | Updates browser top bar / status bar color to match active theme | `activeTheme.color` | `<meta name="theme-color" content="...">` | Defaults to `#0f172a` | `src/app/page.tsx:375` |
| 6 | Legacy Compatibility | Classic Dark Blue Restoration | Restores the original dark blue aesthetic | Theme ID `'bg-[#0f172a]'` | Renders classic dark blue slate background | None | `ORIGINAL_REQUEST.md` & git history |
| 7 | Glassmorphism | Dark Translucent Component Overlays | Universal translucent glassy styling for cards, inputs, and navbars | Any hex dark background | Semi-transparent frosted glass UI elements | Blends over any valid dark hex | `src/app/page.tsx:843` |

---

## 5. Edge Cases & Behavioral Matrix

| # | Feature | Input / Condition | Observed Behavior | Handling / Rule |
|---|---------|-------------------|-------------------|-----------------|
| 1 | Theme Selection | Stored theme ID from legacy version (e.g. `'bg-blue-950'` or `'bg-gray-100'`) | `THEMES.find(t => t.id === bgTheme)` returns `undefined` | Must fall back to default theme color (`#0f172a`) in meta tag, and app remains fully functional with dark glassy overlays |
| 2 | Mobile Viewport | High-contrast status bar rendering | Meta theme-color dynamically switches on theme click | Status bar smoothly blends with page header on Android / iOS Chrome / Safari PWA |
| 3 | FOUC (Fast Load) | Initial page load prior to React hydration | Inline script in `layout.tsx` reads localStorage and activates `.dark` | Page loads without white flash |
| 4 | Offline / Guest Mode | Unauthenticated user opening app | `session` is null, login screen is rendered | Login screen uses `${bgTheme}` and `${t.card}`, rendering chosen dark theme cleanly |
| 5 | Low-luminance contrast | Text over very dark backgrounds (e.g. Pitch Black `#111111`) | White text (`text-white`) and muted text (`text-slate-300` / `text-slate-500`) | Achieves WCAG AAA contrast ratio (> 10:1) across all dark themes |
| 6 | Theme Picker Grid | Long theme names in 2-column grid | Button text truncation via `truncate` class | UI does not break or overflow 2-column grid on mobile (375px viewport) |

---

## 6. Acceptance Criteria & Verification Plan

### Acceptance Criteria
1. **Theme Count & Variety**:
   - `THEMES` array in `src/app/page.tsx` contains $\ge 12$ distinct dark themes.
   - Themes span the full color spectrum (red, orange/amber, yellow/lime, green/emerald, cyan/teal, blue/navy, purple/violet, magenta/velvet, mocha, charcoal, OLED black, sakura).
   - All themes have low luminance ($L \le 20\%$) and high text readability.
2. **Legacy Dark Blue Restored**:
   - `Classic Dark Blue` (`#0f172a`) is included and verified.
3. **Pristine Build & Compilation**:
   - Next.js build (`npm run build`) completes with 0 errors and 0 type violations.
4. **Interactive & Visual Verification**:
   - Switching between all themes in Settings changes the background color, the swatch indicator, and the browser meta theme-color seamlessly.

### Verification Commands
- `npm run build` — Verify TypeScript and Next.js compile cleanly.
- Automated code audit checking `THEMES.length >= 12` and spectrum coverage.
