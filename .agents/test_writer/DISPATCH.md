## 2026-08-25T03:30:33Z

<USER_REQUEST>
You are the E2E Test Writer for the Theme Redesign project.
Read ORIGINAL_REQUEST.md at `d:\AI\جبنة\vibe-todos\.agents\ORIGINAL_REQUEST.md`.
Workspace directory: `d:\AI\جبنة\vibe-todos`.

Your objective:
1. Create a comprehensive opaque-box E2E test verification script at `d:\AI\جبنة\vibe-todos\scripts\verify-themes.js`.
2. The test suite must rigorously evaluate:
   - Tier 1: Feature Coverage (verify `THEMES` array exists, has >=12 themes, each with id, name, and color).
   - Tier 2: Boundary & Math Verification (validate hex color syntax `#RRGGBB`, check for unique IDs/names, compute relative luminance for every theme to mathematically verify all themes are dark: $L < 0.25$, and compute WCAG contrast ratio against white text to verify contrast $\ge 7:1$ AAA).
   - Tier 3: Spectrum Distribution & Bias Elimination (compute hue angles in HSL space for all themes, mathematically verify that at least 6 distinct hue sectors are covered across the 360° spectrum—such as reds, ambers/yellows, greens, teals/cyans, blues, purples/magentas—and verify blue/brown themes do not exceed 30% of the total palette).
   - Tier 4: Legacy Dark Blue Exact Match (assert that "Dark Blue" is present with color `#172554` and id `bg-[#172554]` or `bg-blue-950`).
3. Run the test script (`node scripts/verify-themes.js`) to test the current state and report results.
4. Output `TEST_READY.md` summarizing the test tiers and execution command.
5. Send your completion message back to your parent with your findings.

Write Ownership: You own `scripts/verify-themes.js` and test artifacts. Do NOT modify `src/app/page.tsx`.
</USER_REQUEST>
