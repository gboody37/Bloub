# Teamwork Project Prompt — Draft

> Status: Step 1 — Eliciting project idea
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Redesign the application's color themes. The user feels the current custom themes are too heavily biased towards "blue or brown", and wants a more diverse, vibrant set of purely dark themes. Additionally, the original "dark blue" theme must be restored.

Working directory: d:\AI\جبنة\vibe-todos

## Requirements

### R1. Diverse Theme Palette
The application's theme list (`THEMES` array in `src/app/page.tsx`) must be completely overhauled to include a much wider variety of vibrant, distinct dark themes (e.g. Neon Purple, Emerald Green, Deep Crimson, etc.), eliminating the over-representation of blue/brown variants.

### R2. Restore Legacy Dark Blue
The old "Dark Blue" theme must be perfectly recreated and included in the updated `THEMES` list.

## Acceptance Criteria

### Aesthetic & Variety
- [ ] Visual inspection confirms the `THEMES` array contains at least 12 distinct dark themes spanning the entire color spectrum (reds, greens, purples, cyans, etc.).
- [ ] Visual inspection confirms the original "Dark Blue" theme is present and accurately mimics its previous appearance.

---
*Next: when approved → delegate via invoke_subagent (see Delegation Protocol)*
