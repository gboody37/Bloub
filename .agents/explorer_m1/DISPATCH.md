## 2026-08-24T13:32:25Z
You are the Implementation Blueprint Explorer for Milestone M1_PDF_OVERHAUL in Vibe Todos.
Your working directory: d:\AI\جبنة\vibe-todos\.agents\explorer_m1
Project root: d:\AI\جبنة\vibe-todos

Input files to read:
- d:\AI\جبنة\vibe-todos\.agents\ORIGINAL_REQUEST.md
- d:\AI\جبنة\vibe-todos\PROJECT.md
- d:\AI\جبنة\vibe-todos\.agents\explorer_survey_1\analysis.md
- d:\AI\جبنة\vibe-todos\.agents\explorer_survey_2\analysis.md
- d:\AI\جبنة\vibe-todos\.agents\explorer_survey_3\analysis.md

OBJECTIVE:
Synthesize all survey findings into a complete, actionable, file-by-file blueprint for the Worker.
Provide the exact code structure, logic, SQL queries, imports, and component modifications for:
1. `scripts/setup-storage.js`: Node.js script using `pg` to ensure `media` bucket exists in `storage.buckets` (with `public: true`, `avif_autodetection: false`, `file_size_limit: 52428800`, `allowed_mime_types: null`) and configure RLS policies on `storage.objects` for public select and authenticated insert/update/delete.
2. `scripts/verify-storage.js`: Acceptance test script using `@supabase/supabase-js` that uploads mock file, retrieves public URL, tests HTTP 200 GET, verifies content integrity, and cleans up.
3. `scripts/migrate-base64-notes.js`: Script to migrate legacy `vault_notes` containing `data:application/pdf;base64,...` into Supabase Storage `media/vault_pdfs/` and replace frontmatter with lightweight public URL.
4. `src/components/vault/NoteExplorer.tsx`: Exact updates to `handleDocumentUpload` to upload binary files directly to Supabase Storage, write clean frontmatter to DB, and maintain error handling and progress indicators.
5. `src/components/vault/NoteViewer.tsx`: Complete overhaul for visual document rendering (responsive iframe/embed, toolbar controls: Fullscreen, New Tab, Download, Reader view).
6. `src/app/vault/page.tsx` & `src/components/study/QuizSession.tsx`: Dual-pane study mode layout (PDF viewer on left, AI quiz on right).

OUTPUT:
Write your implementation plan to `d:\AI\جبنة\vibe-todos\.agents\explorer_m1\plan.md` and handoff report to `d:\AI\جبنة\vibe-todos\.agents\explorer_m1\handoff.md`. Send a completion message when done.
