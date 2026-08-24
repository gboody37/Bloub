# Project: Vibe Todos — PDF Upload & Viewer Architecture Overhaul

## Architecture
- **Supabase Storage Infrastructure**: Automated setup script (`scripts/setup-storage.js`) and verification test (`scripts/verify-storage.js`) managing the `media` storage bucket with public access and RLS policies.
- **PDF Upload Pipeline**: `NoteExplorer.tsx` uploads binary PDF buffers directly to Supabase Storage `media` bucket (`vault_pdfs/<userId>/<timestamp>_<filename>.pdf`), storing only the resulting public URL in YAML frontmatter (`pdf_url: https://...`) along with clean extracted text in `vault_notes.content`.
- **Database Migration**: `scripts/migrate-base64-notes.js` converts legacy notes with embedded base64 data to Supabase Storage objects and updates `vault_notes.content` with lightweight public URLs.
- **PDF Viewer UI**: `NoteViewer.tsx` renders the visual PDF document via responsive embedded viewer / iframe with controls (Fullscreen, Open in Tab, Download), integrated with `QuizSession.tsx` in a dual-pane study layout.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Supabase `media` Bucket Creation & RLS | Automated script to create `media` bucket in Supabase and configure public access & RLS policies | M1_PDF_OVERHAUL | ORIGINAL_REQUEST §R2 |
| 2 | Automated Storage Verification Script | `scripts/verify-storage.js` to upload mock file, retrieve public URL, and verify HTTP access | M1_PDF_OVERHAUL | ORIGINAL_REQUEST §Acceptance |
| 3 | Direct Supabase Storage PDF Upload | Frontend `NoteExplorer.tsx` uploads binary files to Supabase Storage `media` bucket and obtains public URL | M1_PDF_OVERHAUL | ORIGINAL_REQUEST §R1 |
| 4 | Base64 Database Cleansing & Migration | Migrate existing base64 notes in `vault_notes` (e.g. 29.37 MB note) to Supabase Storage URLs | M1_PDF_OVERHAUL | ORIGINAL_REQUEST §R1 |
| 5 | Visual PDF Document Viewer | `NoteViewer.tsx` renders responsive visual PDF viewer with interactive controls (open, download, fullscreen) | M1_PDF_OVERHAUL | ORIGINAL_REQUEST §R3 |
| 6 | AI Quiz Dual-Pane Integration | `page.tsx` and `QuizSession.tsx` allow studying the visual PDF alongside interactive AI quiz | M1_PDF_OVERHAUL | ORIGINAL_REQUEST §R3 |
| 7 | End-to-End Verification & Hardening | Full verification suite covering storage, database, UI rendering, and edge cases | M1_PDF_OVERHAUL | ORIGINAL_REQUEST §Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1_PDF_OVERHAUL | Full implementation: Storage infra (`scripts/setup-storage.js`, `scripts/verify-storage.js`), DB migration (`scripts/migrate-base64-notes.js`), Direct upload (`NoteExplorer.tsx`), and UI Overhaul (`NoteViewer.tsx`, `QuizSession.tsx`, `page.tsx`) | none | DONE |

## Interface Contracts
### Storage Setup & Verification (`scripts/setup-storage.js` ↔ `scripts/verify-storage.js`)
- `setup-storage.js`: Idempotently creates `media` bucket, ensures `public: true`, sets RLS policies (`allow_public_read`, `allow_authenticated_insert_update_delete`). Verified and live.
- `verify-storage.js`:
  - Uploads a test buffer to `media/test-probe.txt`.
  - Retrieves `getPublicUrl('test-probe.txt')`.
  - Performs an HTTP GET request to the public URL to ensure 200 OK and matching content.
  - Cleans up probe artifact.
  - Exits with code 0 on success, code 1 on failure. Verified and passing 100%.

### Frontend Upload ↔ Vault Notes Database (`NoteExplorer.tsx` ↔ `supabase.from('vault_notes')`)
- Frontmatter structure in `vault_notes.content`:
  ```yaml
  ---
  title: "<file_title>"
  type: "pdf"
  pdf_url: "https://<supabase-url>/storage/v1/object/public/media/vault_pdfs/<user_id>/<file>.pdf"
  page_count: 12
  uploaded_at: "2026-08-24T..."
  ---
  <extracted clean text content for search and AI quiz>
  ```
- No base64 strings in `vault_notes.content`. Verified 0 base64 notes in live database, payload reduced by 99.55%.

### PDF Viewer ↔ AI Quiz (`NoteViewer.tsx` ↔ `QuizSession.tsx` in `page.tsx`)
- Props / State contract:
  - `note.pdf_url`: Valid public URL string pointing to Supabase Storage CDN.
  - `note.bodyContent`: Extracted text without YAML frontmatter.
  - `QuizSession` receives `noteContent={note.bodyContent}` and runs quiz without base64 prompt pollution.
  - Desktop view: Dual-pane layout (58% visual PDF viewer / 42% AI Quiz session).
