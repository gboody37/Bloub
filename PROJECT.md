# Project: Vibe Todos - Dark Color Themes Redesign & Dark Blue Restoration

## Architecture
- `src/app/page.tsx`: Defines `THEMES` array of `{ id: string, name: string, color: string }`, theme state management, `<meta name="theme-color">`, localStorage persistence (`${uid}_bgTheme`), and component rendering with translucent dark tokens.
- `src/components/modals/SettingsModal.tsx`: Renders theme picker grid with preview dots and names.
- `src/app/layout.tsx`: Anti-flash initial theme hydration script.
- `src/app/globals.css`: Root CSS variables and universal dark styling.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Restore Original Dark Blue Theme | Restore accurate "Dark Blue" theme (`#080d2a`) | M1 | ORIGINAL_REQUEST §1 | DONE |
| 2 | Purely Dark Theme Spectrum | Redesign `THEMES` with 16 distinct, vibrant, purely dark themes spanning all color families (Blue, Purple, Emerald, Crimson, Amber, Cyan, Rose, Slate, OLED, etc.) | M1 | ORIGINAL_REQUEST §1 | DONE |
| 3 | WCAG AAA Contrast & Luminance Rules | Ensure all theme backgrounds maintain $L \le 20\%$ for high contrast against white text and translucent glassy panels | M1 | ORIGINAL_REQUEST §1 | DONE |
| 4 | Theme Persistence & Hydration Contract | Ensure all theme IDs and colors seamlessly integrate with localStorage, anti-flash SSR script, and Settings modal | M1 | ORIGINAL_REQUEST §1 | DONE |
| 5 | E2E Theme Verification Suite | Automated test harness to verify >= 12 dark themes, contrast ratios, spectrum coverage, and theme switching | M2 | Dual Track E2E | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Implementation: Redesign THEMES Array & Restore Dark Blue | Update `src/app/page.tsx` THEMES with 16 vibrant dark themes and original Dark Blue restoration | none | DONE |
| M2 | E2E Testing Suite: Theme Validation Harness | Build comprehensive opaque-box test suite for spectrum, contrast, restoration, and persistence | none | DONE |
| M3 | Final Gate & Adversarial Verification | Run E2E tests, review, adversarial challenge, and forensic integrity audit | M1, M2 | DONE |

## Interface Contracts
### `THEMES` Array Contract
- Type: `Array<{ id: string, name: string, color: string }>`
- `id`: Tailwind background class string (e.g. `bg-[#080d2a]`, `bg-[#1a0b2e]`)
- `name`: Display name in settings modal (e.g. `Dark Blue`, `Midnight Violet`)
- `color`: 6-digit hex string with `#` prefix (e.g. `#080d2a`, `#1a0b2e`)

## Code Layout
- `src/app/page.tsx`: THEMES array definition
- `src/components/modals/SettingsModal.tsx`: Theme picker UI
- `tests/e2e/theme-validation.test.ts`: E2E test harness
- `scripts/verify-themes.js`: CI zero-dependency verification script
- `TEST_READY.md`: Master test readiness report
