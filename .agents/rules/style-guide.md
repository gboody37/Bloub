# Global UI/UX Style Guide & Design Rules

Whenever building, modifying, or reviewing user interfaces and frontend code in this project, you MUST strictly adhere to these rules:

## 1. Interface-First Protocol
- When building new UI or refactoring screens, build the static UI, visual hierarchy, layout grid, and spacing FIRST before implementing complex backend handlers, database calls, or state logic.
- Lock in paddings, alignments, responsive breakpoints, and tactile feel before wiring up interactivity.

## 2. Component Library & Foundation
- Styling Foundation: Tailwind CSS with Radix UI / shadcn patterns.
- Semantic HTML: Proper `<button>`, `<input>`, `<dialog>`, and accessible landmarks with `aria-*` tags.

## 3. Color Palette & Dark Theme Rules
- Deep, clean dark surfaces: `bg-zinc-950` / `bg-slate-950` base backgrounds.
- High-contrast separation: Use subtle 1px border lines (`border-zinc-800` or `border-white/10`) rather than flat gray mush.
- Accent discipline: Exactly one dominant accent per view for primary actions and active selections. Muted secondary controls.

## 4. Typography Hierarchy
- Modern clean font stacks (Inter, Geist, Plus Jakarta Sans, system sans).
- Headings: `font-semibold` or `font-medium`, tight tracking (`tracking-tight`).
- Metadata / Labels: Explicitly muted (`text-zinc-400`, `text-xs`).

## 5. Micro-Interactions & Feel
- Standard transition: `transition-all duration-150 ease-out`.
- Active states: Tactile press feedback (`active:scale-[0.98]`).
- Focus rings: High-contrast, clean focus indicators (`focus-visible:ring-2 focus-visible:ring-offset-2`).
- Touch-first ergonomics: Minimum 44x44px interactive tap targets for tablet/mobile.
