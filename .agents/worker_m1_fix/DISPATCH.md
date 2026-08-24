## 2026-08-24T13:45:12Z

<USER_REQUEST>
You are the Implementation Worker for Iteration 2 of Milestone M1_PDF_OVERHAUL in Vibe Todos.
Your working directory is: d:\AI\جبنة\vibe-todos\.agents\worker_m1_fix
Project root: d:\AI\جبنة\vibe-todos

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

READ REFERENCE FILES:
- d:\AI\جبنة\vibe-todos\.agents\ORIGINAL_REQUEST.md
- d:\AI\جبنة\vibe-todos\PROJECT.md
- d:\AI\جبنة\vibe-todos\.agents\reviewer_m1_1\review.md
- d:\AI\جبنة\vibe-todos\.agents\challenger_m1_2\challenge.md
- d:\AI\جبنة\vibe-todos\tests\challenger\m1-pdf-overhaul-challenger2.test.js

PROBLEM TO RESOLVE:
Reviewer 1 and Challenger 2 identified that the database row for `Documents/1.pdf.md` in `public.vault_notes` has a missing newline before the closing `---` (`pdf_url: "https://..."---`), which caused `src/lib/obsidian/parser.ts` to return empty frontmatter and `undefined` for `pdf_url`, falling back to raw text in `NoteViewer.tsx`.

TASKS:
1. Update `src/lib/obsidian/parser.ts`: Harden `parseObsidianMarkdown` regex so it resiliently matches frontmatter even with optional or missing trailing newlines before `---`.
2. Update `scripts/migrate-base64-notes.js`: Fix replacement to ensure clean newlines: `pdf_url: "${publicUrl}"\n`.
3. Fix database row `Documents/1.pdf.md` in `public.vault_notes`: Execute a Node/PG script to format the frontmatter with clean `\n---\n`.
4. Run verification tests:
   - `node tests/challenger/m1-pdf-overhaul-challenger2.test.js`
   - `node scripts/verify-storage.js`
   - `node scripts/migrate-base64-notes.js`
   - `npm.cmd run build`

OUTPUT:
Write your report to `d:\AI\جبنة\vibe-todos\.agents\worker_m1_fix\changes.md` and complete handoff to `d:\AI\جبنة\vibe-todos\.agents\worker_m1_fix\handoff.md`. Include test execution outputs and send a message to parent when done.
</USER_REQUEST>
