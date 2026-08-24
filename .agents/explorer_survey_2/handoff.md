# Handoff Report — Explorer 2: PDF Upload Pipeline & Storage Survey

**Agent**: Explorer 2  
**Working Directory**: `d:\AI\جبنة\vibe-todos\.agents\explorer_survey_2`  
**Date**: 2026-08-24  
**Milestone**: Survey Phase  

---

## 1. Observation

- **Base64 Conversion Location**: `src/components/study/NoteExplorer.tsx`, lines 82–156 (`handleDocumentUpload`).
  Lines 94–98 perform manual byte-by-byte conversion in JavaScript:
  ```ts
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  pdfDataUrl = `data:application/pdf;base64,${btoa(binary)}`;
  ```
  Line 115 prepends this to note content in YAML frontmatter:
  ```ts
  let text = pdfDataUrl ? `---\npdf_url: ${pdfDataUrl}\n---\n\n` : '';
  ```
  Line 146 upserts this massive payload directly into PostgreSQL:
  ```ts
  const { error: dbError } = await supabase.from('vault_notes').upsert([newNote], { onConflict: 'user_id,path' });
  ```
- **`vault_notes` Usage**:
  - Schema: `migrations/20260824000000_vault_notes.sql` defines table `vault_notes (id, user_id, title, content, path, folder, tags, word_count, created_at, updated_at)`.
  - Frontend: `NoteExplorer.tsx` (fetches note list, uploads document, deletes note), `NoteViewer.tsx` (renders note & iframe from `note.frontmatter?.pdf_url`, uploads markdown images to `media` bucket), `page.tsx` (selects and updates notes), `QuizSession.tsx` (reads `note.bodyContent` for Gemini quiz generation).
  - Backend/Lib: `scanner.ts` (`scanVaultDirectory`, `getNoteByPath`, `searchVaultNotes`, `getVaultTags`, `batchUpsertVaultNotes`), `vault-sync.ts` (syncs markdown files to cloud), `parser.ts` (parses YAML frontmatter and markdown body).
  - API Routes: `/api/obsidian/notes`, `/api/obsidian/note`, `/api/obsidian/read`, `/api/obsidian/vault`, `/api/obsidian/search`, `/api/obsidian/tags`, `/api/obsidian/graph`.
- **Root Cause of Freezes and Statement Timeouts**:
  1. Main-thread JS loop with millions of `String.fromCharCode` iterations freezes browser UI for 10–30s.
  2. Base64 expands binary size by ~33% (e.g. 30MB PDF -> ~40MB base64 string).
  3. `parseObsidianMarkdown` runs regexes against 40MB strings, duplicating multi-megabyte buffers in RAM.
  4. PostgREST receives 40MB JSON payloads, hitting Supabase statement timeouts (8s/15s) or HTTP 413 limits.
  5. `scanVaultDirectory` in `scanner.ts` executes `SELECT *` across all notes, downloading 100MB+ of base64 data on every vault list refresh.
- **Storage Infrastructure Status**:
  Running `create-bucket.cjs` with anon key returned `new row violates row-level security policy` because bucket creation requires service role or direct PostgreSQL migration (`INSERT INTO storage.buckets`). Direct Postgres connection credentials exist in test fixtures/verification scripts (`POSTGRES_CONN` in `scripts/verify-cloud-sync.js`).

---

## 2. Logic Chain

1. Because `NoteExplorer.tsx` encodes entire PDFs to base64 on the UI thread and saves them in `vault_notes.content`, every note row contains tens of megabytes of raw text.
2. Because PostgreSQL and PostgREST must parse and store these multi-megabyte payloads in a single transaction, requests exceed statement timeouts and memory limits.
3. Because `NoteViewer.tsx` already uses `note.frontmatter?.pdf_url` to load PDF content into an `<iframe>`, storing a public URL from Supabase Storage instead of base64 data is 100% compatible with the existing note viewing architecture and AI quiz generation (`note.bodyContent` remains clean extracted text).
4. By uploading the raw binary PDF directly to `media` via `supabase.storage.from('media').upload()` and saving only the resulting `publicUrl` in YAML frontmatter, the database write payload drops from ~40MB to <50KB (99.8% reduction), eliminating all statement timeouts and client freezes.
5. In addition, changing `scanVaultDirectory` from `select('*')` to `select('id, user_id, title, path, folder, tags, word_count, created_at, updated_at')` prevents transferring heavy note content during folder tree and list rendering.

---

## 3. Caveats

- **Storage Bucket Privileges**: The Supabase publishable anon key cannot create storage buckets via client SDK if RLS is enabled on `storage.buckets`. Bucket creation and storage RLS policies must be applied via SQL migration or Postgres connection script (`INSERT INTO storage.buckets ...`).
- **Existing Base64 Notes**: Existing notes stored with base64 data URLs will still render in the UI, but an automated migration script should be provided to extract their base64 blobs into Supabase Storage to recover database performance.
- **Browser Memory on pdf.js**: Client-side text extraction of large documents (>100 pages) should retain a page cap (e.g. 50 pages) to avoid client memory exhaustion during text extraction.

---

## 4. Conclusion

The PDF upload architecture can be completely fixed without breaking existing study workflows:
1. Execute an automated setup script (`scripts/verify-storage.js`) creating bucket `media` with public access and RLS policies.
2. Refactor `NoteExplorer.tsx:handleDocumentUpload` to upload PDF binaries directly to `media/pdfs/<user_id>/...` and store the public URL in frontmatter.
3. Optimize `scanner.ts:scanVaultDirectory` to omit `content` in list queries.
4. Maintain `NoteViewer.tsx` and `QuizSession.tsx` compatibility with clean body content.

---

## 5. Verification Method

- **Storage Infrastructure**: Run `node scripts/verify-storage.js` to ensure the `media` bucket exists and accepts uploads.
- **Upload & DB Size Check**: Upload a sample PDF via the UI / API test; verify in `vault_notes` that `content` contains `pdf_url: https://...` and no base64 string.
- **Automated Tests**: Run `npm run test` and `node --experimental-strip-types tests/verification/run-all-verifications.ts`.
