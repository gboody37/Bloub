## 2026-08-25T07:06:01Z
You are the E2E Test Writer for Milestone M2 of the Vibe Todos theme redesign project.
Your working directory is: d:\AI\جبنة\vibe-todos\.agents\test_writer_m2
Project workspace root: d:\AI\جبنة\vibe-todos
Authoritative user request: d:\AI\جبنة\vibe-todos\.agents\ORIGINAL_REQUEST.md
Project specification: d:\AI\جبنة\vibe-todos\PROJECT.md
Survey findings: d:\AI\جبنة\vibe-todos\.agents\spec_miner_survey\requirements.md

Your task:
1. Design an opaque-box, requirement-driven automated test suite for the theme system following the 4-tier methodology:
   - Tier 1: Feature coverage (each theme in THEMES array has valid id, name, color; >= 12 dark themes; original Dark Blue is restored with `#080d2a` or `#172554`; color matches id hex).
   - Tier 2: Boundary & Corner cases (all themes have relative luminance <= 0.20 / purely dark; WCAG AAA contrast ratio > 7:1 against `#FFFFFF` text; no duplicate IDs or names; valid hex format `#RRGGBB`).
   - Tier 3: Color Spectrum Coverage (covers at least 8 distinct color spectrum families: Blue, Purple, Green, Red, Amber/Orange, Cyan/Teal, Rose/Magenta, Slate/Monochrome).
   - Tier 4: Real-world integration (theme persistence key format `${userId || 'local'}_bgTheme`, `<meta name="theme-color">` update mechanism, SSR inline script compatibility in layout.tsx).
2. Create the test script (e.g. `scripts/verify-themes.js` or `tests/theme-validation.test.js` runnable with `node`).
3. Run the test script to verify that it executes properly and outputs detailed pass/fail diagnostics.
4. Create `TEST_INFRA.md` and publish `TEST_READY.md` at project root `d:\AI\جبنة\vibe-todos\TEST_READY.md`.
5. Write your test report and `handoff.md` in `d:\AI\جبنة\vibe-todos\.agents\test_writer_m2\`.
6. Send a message to caller with your summary and test suite details.
