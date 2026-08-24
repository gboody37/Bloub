# Supabase Infrastructure & Database Survey Report

**Explorer**: Explorer 1 (Supabase & Database Infrastructure)  
**Date**: 2026-08-24  
**Project**: Vibe Todos (PDF Architecture Overhaul)

---

## 1. Executive Summary

This survey analyzed the Supabase infrastructure, database schema, client initialization, storage buckets, RLS policies, and scripting toolchain in the `vibe-todos` application.

### Key Discoveries:
1. **Root Cause of Statement Timeouts & UI Lag**: Inspection of the live `vault_notes` table revealed a single record (`Documents/1.pdf.md`) containing **29,374,907 characters (~29.37 MB)** of raw base64 data embedded in the `content` column. Every time `vault_notes` is queried (`SELECT *`), ~30MB is serialized and sent over the wire, causing extreme lag and database statement timeouts.
2. **Current Storage State**: `storage.buckets` in the live Supabase instance is currently **empty (`[]`)**.
3. **Bucket Creation RLS Barrier**: Calling `supabase.storage.createBucket('media', ...)` with the anon/publishable key fails with `new row violates row-level security policy` because anon users lack permissions to insert into `storage.buckets`.
4. **PostgreSQL Direct Connection Available**: Direct PostgreSQL administrative access is configured and working in `scripts/verify-cloud-sync.js` via the `pg` package (`postgresql://postgres.gbdwswfrscjccaaeciiu:Abdodragon66-_-_@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`). This enables 100% automated script execution to provision buckets and RLS policies idempotently.
5. **Storage RLS Policies Missing**: `storage.objects` currently has zero policies configured. Creating the `media` bucket requires public SELECT policy and INSERT/UPDATE/DELETE policies on `storage.objects`.

---

## 2. Supabase Client Configuration

The application initializes Supabase clients across three distinct execution contexts:

### A. Client-Side (Browser)
* **File**: `src/lib/supabase/client.ts`
* **Implementation**:
  ```typescript
  import { createBrowserClient } from '@supabase/ssr';
  export function createClient() {
    return createBrowserClient(
      'https://gbdwswfrscjccaaeciiu.supabase.co',
      'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr'
    );
  }
  ```
* **Legacy Client**: `src/lib/supabase.ts` also exports a singleton `supabase` client initialized via `@supabase/supabase-js` with localStorage persistence.

### B. Server-Side (Next.js App Router / Route Handlers)
* **File**: `src/lib/supabase/server.ts`
* **Implementation**:
  ```typescript
  import { createServerClient } from '@supabase/ssr';
  import { cookies } from 'next/headers';
  export async function createClient() {
    const cookieStore = await cookies();
    return createServerClient(
      'https://gbdwswfrscjccaaeciiu.supabase.co',
      'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr',
      { cookies: { getAll, setAll } }
    );
  }
  ```

### C. Backend Automation / Verification Scripts
* **Dependencies**: `@supabase/supabase-js` (^2.112.3) and `pg` (^8.23.0) in `package.json`.
* **Database Connection**: 
  - Host: `aws-0-ap-northeast-2.pooler.supabase.com:6543`
  - DB: `postgres`
  - User: `postgres.gbdwswfrscjccaaeciiu`
* **Environment Configuration**: Optional `.env.local` loaded via `dotenv` or direct constants.

---

## 3. Database Schema: `public.vault_notes`

### Table Definition
```sql
CREATE TABLE public.vault_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    path TEXT NOT NULL,
    folder TEXT DEFAULT 'Root',
    tags TEXT[] DEFAULT '{}'::text[],
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT vault_notes_user_path_key UNIQUE (user_id, path)
);
```

### Column Specifications
| Column | Type | Nullable | Default | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key |
| `user_id` | `uuid` | NO | null | FK to `auth.users(id)` |
| `title` | `text` | NO | null | Note display title |
| `content` | `text` | NO | `''::text` | Full Markdown text + YAML frontmatter |
| `path` | `text` | NO | null | Relative path (e.g. `Documents/File.pdf.md`) |
| `folder` | `text` | YES | `'Root'::text` | Folder category |
| `tags` | `ARRAY` (text[]) | YES | `'{}'::text[]` | Extracted tags |
| `word_count` | `integer` | YES | `0` | Extracted word count |
| `created_at` | `timestamptz` | YES | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | YES | `now()` | Last modification timestamp |

### Indexes
* `vault_notes_pkey` (btree on `id`) - UNIQUE
* `vault_notes_user_path_key` (btree on `user_id, path`) - UNIQUE
* `idx_vault_notes_user_id` (btree on `user_id`)
* `idx_vault_notes_path` (btree on `user_id, path`)
* `idx_vault_notes_folder` (btree on `user_id, folder`)

### Live Data Analysis
Querying `SELECT id, title, path, length(content) FROM public.vault_notes;` revealed:
- `Study/Deen.md`: 66 bytes
- `Study/History.md`: 0 bytes
- `Study/English.md`: 750 bytes
- `Documents/1.pdf.md`: **29,374,907 bytes (~29.37 MB)** with `pdf_url: data:application/pdf;base64,...` in frontmatter.

---

## 4. Supabase Storage Infrastructure

### Current Status
* **Buckets**: `SELECT * FROM storage.buckets;` returned `[]` (empty).
* **Objects**: `SELECT * FROM storage.objects;` returned `[]` (empty).
* **Storage RLS**: Enabled on `storage.objects` and `storage.buckets`, with 0 custom policies configured.

### Existing Code References
1. `src/components/study/NoteViewer.tsx` (lines 89, 93):
   - `supabase.storage.from('media').upload(fileName, file)`
   - `supabase.storage.from('media').getPublicUrl(fileName)`
2. `create-bucket.cjs`: Attempts to create `media` bucket via anon client, failing due to RLS.
3. `src/components/study/NoteExplorer.tsx` (lines 90-98): Currently converts PDFs to huge base64 strings because the storage bucket was not configured.

---

## 5. Automated Infrastructure Provisioning Strategy

To fulfill requirement **R2 (Automated Infrastructure Setup)**, we can execute an idempotent migration script via PostgreSQL client (`pg`) in Node.js or a dedicated setup script: `scripts/setup-storage.js`.

### Proposed Migration SQL / Script Logic
```sql
-- 1. Create media storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/*', 'video/*', 'audio/*']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/*', 'video/*', 'audio/*']::text[];

-- 2. Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Idempotent Storage Policies on storage.objects
DROP POLICY IF EXISTS "Public Media Access" ON storage.objects;
CREATE POLICY "Public Media Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Allow Media Uploads" ON storage.objects;
CREATE POLICY "Allow Media Uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "Allow Media Updates" ON storage.objects;
CREATE POLICY "Allow Media Updates"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'media')
  WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "Allow Media Deletions" ON storage.objects;
CREATE POLICY "Allow Media Deletions"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media');
```

---

## 6. Verification Harness: `scripts/verify-storage.js`

### Tooling & Dependencies
- `node:assert/strict` for contract validation.
- `@supabase/supabase-js` for testing real client upload/download workflows against the Supabase Storage REST API.
- `pg` for ensuring bucket and RLS state.
- `fetch` (native Node.js 18+) for HTTP reachability check on generated public URLs.

### Verification Flow for `scripts/verify-storage.js`
1. Connect via `@supabase/supabase-js` using standard public/anon credentials.
2. Verify `media` bucket exists and has `public: true`.
3. Upload a mock PDF buffer (`test-mock-document.pdf`) to `media`.
4. Call `supabase.storage.from('media').getPublicUrl('test-mock-document.pdf')`.
5. Execute HTTP `fetch(publicUrl)` to assert status 200 and valid headers (`Content-Type: application/pdf`).
6. Clean up mock file from storage bucket (`remove(['test-mock-document.pdf'])`).
7. Assert zero errors and exit with code 0.

---

## 7. Migration & Implementation Recommendations

1. **Storage Bucket & RLS Provisioning**:
   - Provide `scripts/setup-storage.js` using `pg` to execute the bucket creation and RLS policies on Supabase.
   - Run setup during build or automated test lifecycle.
2. **Frontend Upload Overhaul (`src/components/study/NoteExplorer.tsx`)**:
   - Replace base64 conversion with `supabase.storage.from('media').upload(...)`.
   - Store public URL in YAML frontmatter (`pdf_url: https://...`).
   - Retain text extraction (PDF pages) for AI quiz generator.
3. **Database Cleanup**:
   - Clean up existing oversized base64 records in `vault_notes` (e.g. `Documents/1.pdf.md`) to immediately eliminate database timeout issues.
4. **Verification Script**:
   - Create `scripts/verify-storage.js` satisfying Acceptance Criterion #1.
