# Vibe Todos — Automated Theme Test Infrastructure (`TEST_INFRA.md`)

## 1. Overview & Objectives
This document describes the automated test infrastructure, mathematical color models, test fixtures, execution scripts, and CI/CD harnesses for the **Vibe Todos Theme System & Dark Blue Restoration** (Milestones M1 & M2).

The test infrastructure validates:
- **Tier 1 (Feature Coverage)**: Theme schema integrity, array length $\ge 12$, Tailwind class format parity (`id === bg-[${color}]`), and restoration of the legacy Dark Blue theme (`#080d2a` / `#172554` / `#0f172a`).
- **Tier 2 (Boundary & WCAG Compliance)**: Purely dark relative luminance ($L \le 0.20$), WCAG 2.1 AAA high contrast ratio ($CR \ge 7.0:1$ against white `#FFFFFF` text), and strict 6-digit hex regex validation.
- **Tier 3 (Color Spectrum Coverage)**: Full 360-degree chromatic spectrum representation across at least 8 distinct families (Blue, Purple, Green, Red, Amber/Orange, Cyan/Teal, Rose/Magenta, Slate/Monochrome).
- **Tier 4 (Real-World Integration)**: Per-user LocalStorage persistence keying (`${uid}_bgTheme`), dynamic `<meta name="theme-color">` synchronization, anti-flash SSR inline script hydration in `src/app/layout.tsx`, and Settings modal UI button handler bindings.
- **Tier 5 (Adversarial Robustness)**: Malformed hex rejection, light color detection/rejection, boundary contrast at pure black `#000000` (21:1), and grayscale/achromatic classification stability.

---

## 2. File Organization & Architecture

```
d:\AI\جبنة\vibe-todos\
├── scripts\
│   └── verify-themes.js                     # Zero-dependency standalone verification script
├── tests\
│   ├── e2e\
│   │   ├── theme-helpers.ts                 # Shared math, WCAG luminance, HSL converter & parser
│   │   └── theme-validation.test.ts         # 5-tier E2E & unit test suite (node:test runner)
│   └── verification\
│       └── verify-theme-redesign.ts         # Master 4-tier acceptance criteria CLI verification runner
├── TEST_INFRA.md                            # Infrastructure documentation & math specifications
├── TEST_READY.md                            # Test completion & readiness signoff
└── package.json                             # Configured with npm scripts (test:themes, verify:themes)
```

---

## 3. Mathematical Foundations & WCAG Algorithms

### 3.1 Relative Luminance ($L$)
Relative luminance is computed following the **W3C Web Content Accessibility Guidelines (WCAG 2.1 §1.4.3 & §1.4.6)**:

1. Convert sRGB integer components ($R, G, B \in [0, 255]$) to linear values:
   $$c = \frac{C}{255}$$
   $$c_{linear} = \begin{cases} \frac{c}{12.92} & \text{if } c \le 0.04045 \\ \left(\frac{c + 0.055}{1.055}\right)^{2.4} & \text{if } c > 0.04045 \end{cases}$$

2. Compute relative luminance $L$:
   $$L = 0.2126 \cdot R_{linear} + 0.7152 \cdot G_{linear} + 0.0722 \cdot B_{linear}$$

- **Darkness Invariant**: $L \le 0.20$ for all theme background colors.
- **Observed Range in App**: $0.0021 \le L \le 0.0257$ (Substantially below $0.20$ threshold, ensuring pristine deep-dark aesthetics).

### 3.2 Contrast Ratio ($CR$) against White Text (`#FFFFFF`)
White text has linear luminance $L_1 = 1.0$. The contrast ratio against background luminance $L_2$ is:
$$CR = \frac{L_1 + 0.05}{L_2 + 0.05} = \frac{1.05}{L_{bg} + 0.05}$$

- **WCAG AA Normal Text Minimum**: $4.5:1$
- **WCAG AAA Normal Text Minimum**: $7.0:1$
- **Observed Range in App**: $13.88:1 \le CR \le 20.13:1$ (Exceeds WCAG AAA requirements across 100% of themes).

### 3.3 Chromatic Spectrum Classification
Converts RGB to HSL $(H \in [0^\circ, 360^\circ], S \in [0, 1], L \in [0, 1])$:
- **Slate / Monochrome / Charcoal**: Saturation $S < 0.22$ or $R = G = B$
- **Red / Crimson**: $((H \ge 325^\circ \land H \le 360^\circ) \lor (H \ge 0^\circ \land H < 15^\circ)) \land R \ge G \land R \ge B$
- **Amber / Orange**: $15^\circ \le H < 50^\circ$
- **Yellow / Chartreuse**: $50^\circ \le H < 70^\circ$
- **Green / Emerald / Moss**: $70^\circ \le H < 165^\circ$
- **Cyan / Teal / Arctic**: $165^\circ \le H < 215^\circ$
- **Blue / Navy / Indigo**: $215^\circ \le H < 255^\circ$
- **Purple / Violet / Plum**: $255^\circ \le H < 290^\circ$
- **Rose / Magenta / Velvet**: $290^\circ \le H < 325^\circ$

---

## 4. Test Execution Matrix & Commands

| Suite | File | Command | Target Criteria |
|---|---|---|---|
| **E2E & Unit Suite** | `tests/e2e/theme-validation.test.ts` | `node --experimental-strip-types --test tests/e2e/theme-validation.test.ts` | 22 tests across Tiers 1–5 |
| **Master Verification** | `tests/verification/verify-theme-redesign.ts` | `node --experimental-strip-types tests/verification/verify-theme-redesign.ts` | 4 Acceptance Criteria (AC1–AC4) |
| **CI Standalone** | `scripts/verify-themes.js` | `node scripts/verify-themes.js` | Zero-dependency verification for CI/CD |
| **NPM Script** | `package.json` | `npm run test:themes` | Runs native test runner |
| **NPM Script** | `package.json` | `npm run verify:themes` | Runs standalone script |
| **NPM Script** | `package.json` | `npm run verify:themes-full` | Runs master acceptance verification |

---

## 5. Live Theme Palette Verification Results (16 Themes)

| # | Theme Name | Tailwind Class | Hex Color | Rel. Luminance | Contrast to `#FFFFFF` | Spectrum Family |
|---|---|---|---|---|---|---|
| 1 | Dark Blue | `bg-[#080d2a]` | `#080d2a` | 0.0051 | 19.07:1 | **Blue** (Legacy Restored) |
| 2 | Midnight Violet | `bg-[#1a0b2e]` | `#1a0b2e` | 0.0066 | 18.56:1 | **Purple** |
| 3 | Emerald Night | `bg-[#022c22]` | `#022c22` | 0.0193 | 15.15:1 | **Cyan/Teal** |
| 4 | Crimson Ember | `bg-[#3b0712]` | `#3b0712` | 0.0113 | 17.14:1 | **Red** |
| 5 | Solar Amber | `bg-[#422006]` | `#422006` | 0.0220 | 14.57:1 | **Amber/Orange** |
| 6 | Abyssal Cyan | `bg-[#082f49]` | `#082f49` | 0.0257 | 13.88:1 | **Cyan/Teal** |
| 7 | Neon Rose | `bg-[#380424]` | `#380424` | 0.0105 | 17.34:1 | **Rose/Magenta** |
| 8 | Forest Moss | `bg-[#052e16]` | `#052e16` | 0.0204 | 14.91:1 | **Green** |
| 9 | Royal Indigo | `bg-[#1e1b4b]` | `#1e1b4b` | 0.0157 | 15.99:1 | **Blue** |
| 10 | Deep Plum | `bg-[#2e0854]` | `#2e0854` | 0.0139 | 16.42:1 | **Purple** |
| 11 | Burnt Bronze | `bg-[#3c1605]` | `#3c1605` | 0.0155 | 16.04:1 | **Amber/Orange** |
| 12 | Titanium Slate | `bg-[#0f172a]` | `#0f172a` | 0.0088 | 17.85:1 | **Blue** |
| 13 | Obsidian OLED | `bg-[#030712]` | `#030712` | 0.0021 | 20.13:1 | **Blue** |
| 14 | Phantom Charcoal | `bg-[#18181b]` | `#18181b` | 0.0093 | 17.72:1 | **Slate/Monochrome** |
| 15 | Mystic Magenta | `bg-[#3b0d2d]` | `#3b0d2d` | 0.0141 | 16.39:1 | **Rose/Magenta** |
| 16 | Arctic Navy | `bg-[#0c1a30]` | `#0c1a30` | 0.0103 | 17.41:1 | **Blue** |
