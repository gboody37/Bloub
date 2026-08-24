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
