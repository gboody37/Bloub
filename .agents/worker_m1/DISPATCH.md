## 2026-08-24T13:35:23Z
You are the Lead Implementation Worker for Milestone M1_PDF_OVERHAUL in Vibe Todos.
Your working directory is: d:\AI\جبنة\vibe-todos\.agents\worker_m1
Project root: d:\AI\جبنة\vibe-todos

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

REFERENCE FILES TO READ:
- d:\AI\جبنة\vibe-todos\.agents\ORIGINAL_REQUEST.md
- d:\AI\جبنة\vibe-todos\PROJECT.md
- d:\AI\جبنة\vibe-todos\.agents\explorer_m1\plan.md
- d:\AI\جبنة\vibe-todos\.agents\explorer_m1\handoff.md

EXCLUSIVE FILE WRITE OWNERSHIP:
- `scripts/setup-storage.js`
- `scripts/verify-storage.js`
- `scripts/migrate-base64-notes.js`
- `src/components/study/NoteExplorer.tsx`
- `src/components/vault/NoteExplorer.tsx`
- `src/components/study/NoteViewer.tsx`
- `src/components/vault/NoteViewer.tsx`
- `src/components/study/QuizSession.tsx`
- `src/app/page.tsx`
- `src/app/vault/page.tsx`

TASKS:
1. Implement `scripts/setup-storage.js` and execute it (`node scripts/setup-storage.js`) to create the `media` storage bucket in Supabase and configure RLS policies on `storage.objects`.
2. Implement `scripts/verify-storage.js` and execute it (`node scripts/verify-storage.js`) to verify mock upload, public URL generation, HTTP 200 reachability, content integrity, and probe cleanup.
3. Implement `scripts/migrate-base64-notes.js` and execute it (`node scripts/migrate-base64-notes.js`) to convert existing base64 notes in `vault_notes` to Supabase Storage URLs and reduce database payload.
4. Update `src/components/study/NoteExplorer.tsx` and `src/components/vault/NoteExplorer.tsx` to directly upload binary files to Supabase Storage bucket `media` and store public URLs.
5. Overhaul `src/components/study/NoteViewer.tsx` and `src/components/vault/NoteViewer.tsx` to render the visual PDF viewer with toolbar controls (Fullscreen, Open in Tab, Download, Reader View).
6. Update `src/components/study/QuizSession.tsx`, `src/app/page.tsx`, and `src/app/vault/page.tsx` to support the dual-pane study layout.
7. Run the verification test suite (`node scripts/verify-storage.js`) and application build/checks.

OUTPUT:
Write your implementation report to `d:\AI\جبنة\vibe-todos\.agents\worker_m1\changes.md` and complete handoff report to `d:\AI\جبنة\vibe-todos\.agents\worker_m1\handoff.md`. Include exact command execution outputs in your handoff report. Send a completion message when done.

## 2026-08-25T03:30:33Z
You are the Implementation Worker for Milestone 1: Theme Palette Overhaul & Legacy Dark Blue Restoration.
Read ORIGINAL_REQUEST.md at `d:\AI\جبنة\vibe-todos\.agents\ORIGINAL_REQUEST.md`.
Workspace directory: `d:\AI\جبنة\vibe-todos`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your objective:
1. Update `THEMES` in `src/app/page.tsx` with the 15-theme Dark Spectrum catalog designed by the survey explorers:
   - Dark Blue (Legacy Restored): `{ id: 'bg-[#172554]', name: 'Dark Blue', color: '#172554' }`
   - Ruby Crimson: `{ id: 'bg-[#2b0610]', name: 'Ruby Crimson', color: '#2b0610' }`
   - Sunset Amber: `{ id: 'bg-[#2f1203]', name: 'Sunset Amber', color: '#2f1203' }`
   - Cyber Gold: `{ id: 'bg-[#262002]', name: 'Cyber Gold', color: '#262002' }`
   - Electric Lime: `{ id: 'bg-[#132c03]', name: 'Electric Lime', color: '#132c03' }`
   - Forest Pine: `{ id: 'bg-[#092612]', name: 'Forest Pine', color: '#092612' }`
   - Emerald Jade: `{ id: 'bg-[#022c1b]', name: 'Emerald Jade', color: '#022c1b' }`
   - Abyss Teal: `{ id: 'bg-[#032925]', name: 'Abyss Teal', color: '#032925' }`
   - Neon Cyan: `{ id: 'bg-[#022b38]', name: 'Neon Cyan', color: '#022b38' }`
   - Midnight Velvet: `{ id: 'bg-[#100d3d]', name: 'Midnight Velvet', color: '#100d3d' }`
   - Neon Amethyst: `{ id: 'bg-[#240742]', name: 'Neon Amethyst', color: '#240742' }`
   - Cyberpunk Magenta: `{ id: 'bg-[#36052d]', name: 'Cyberpunk Magenta', color: '#36052d' }`
   - Sakura Twilight: `{ id: 'bg-[#30081e]', name: 'Sakura Twilight', color: '#30081e' }`
   - Obsidian Noir: `{ id: 'bg-[#09090b]', name: 'Obsidian Noir', color: '#09090b' }`
   - Nordic Slate: `{ id: 'bg-[#161b26]', name: 'Nordic Slate', color: '#161b26' }`

2. Check if any other files or components reference the theme IDs/names and ensure seamless compatibility.
3. Run the project build / typecheck (`npm run build` or `npx next build`) to verify zero errors or regressions.
4. Report your work, verification commands, and pass/fail results via send_message to your parent.

Write Ownership: You own `src/app/page.tsx`.
