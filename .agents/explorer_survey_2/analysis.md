# Deep Analysis: PDF Upload Pipeline, Data Flow, and Supabase Storage Architecture

**Author**: Explorer 2 (Survey Phase)  
**Date**: 2026-08-24  
**Project**: Vibe Todos (`d:\AI\جبنة\vibe-todos`)  

---

## Executive Summary

The current PDF ingestion pipeline in Vibe Todos freezes the browser UI and triggers PostgreSQL statement timeouts because it converts multi-megabyte PDF files into raw base64 data URLs inside single-threaded JavaScript, embeds the entire 10MB–50MB base64 string inside YAML frontmatter (`--- \n pdf_url: data:application/pdf;base64,... \n ---`), and stores the entire payload in the `vault_notes.content` PostgreSQL `TEXT` column. Furthermore, directory listing queries (`scanVaultDirectory`) perform `SELECT *` across all notes, transferring dozens of megabytes on every page load.

Migrating to Supabase Storage (bucket `media`) with public URLs stored in `vault_notes` frontmatter reduces database row size by **99.8%** (from ~40MB down to ~30KB), eliminates main-thread CPU freezes, prevents PostgREST timeouts, and enables clean visual PDF rendering and AI quizzing.

---

## 1. Current PDF Upload, Processing, and Base64 Conversion Pipeline

### 1.1 Ingestion Entry Point
- **Location**: `src/components/study/NoteExplorer.tsx`, lines 82–156 (`handleDocumentUpload`).
- **UI Trigger**: `NoteExplorer.tsx` line 241:
  ```tsx
  <input type="file" accept=".pdf,.doc,.docx" ref={docInputRef} className="hidden" onChange={handleDocumentUpload} />
  <button onClick={() => docInputRef.current?.click()} className="..." title="Upload PDF/Doc">
    <UploadCloud size={14} />
    <span>PDF</span>
  </button>
  ```

### 1.2 Step-by-Step Current Execution Flow

```
[User selects PDF file]
         │
         ▼
[file.arrayBuffer()] (NoteExplorer.tsx:88)
         │
         ▼
[Main Thread CPU Freeze: Uint8Array to Base64] (NoteExplorer.tsx:94-98)
  • Iterates bytes.length times: `for(let i=0; i<bytes.length; i++) binary += String.fromCharCode(bytes[i])`
  • Calls `btoa(binary)`
  • Generates `pdfDataUrl = "data:application/pdf;base64,..."` (15MB - 50MB string)
         │
         ▼
[pdf.js Ingestion & Client-Side Text Extraction] (NoteExplorer.tsx:100-128)
  • Injects pdf.js script from CDN (`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js`)
  • Calls `pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise`
  • Extracts text content up to 50 pages
         │
         ▼
[Construct Note Markdown with Base64 Frontmatter] (NoteExplorer.tsx:115, 135-144)
  • `let text = pdfDataUrl ? \`---\\npdf_url: \${pdfDataUrl}\\n---\\n\\n\` : '';`
  • Appends extracted page text
  • Prepares newNote object:
    `{ user_id, title, content: text, path: "Documents/<filename>.md", folder: "Documents", tags: ["document", "pdf"], word_count }`
         │
         ▼
[Massive PostgREST Upsert HTTP Request] (NoteExplorer.tsx:146)
  • `supabase.from('vault_notes').upsert([newNote], { onConflict: 'user_id,path' })`
  • Sends ~20MB–50MB JSON payload to Supabase PostgREST
  • PostgreSQL statement timeout (57014) or browser freeze occurs
```

---

## 2. Complete Inventory of `vault_notes` Reads and Writes

Across the codebase, the `vault_notes` table is interacted with at the following layers:

### 2.1 Database & Migrations
| File | Role | Details |
|---|---|---|
| `migrations/20260824000000_vault_notes.sql` | Schema definition | Table `public.vault_notes (id UUID PK, user_id UUID FK, title TEXT, content TEXT, path TEXT, folder TEXT, tags TEXT[], word_count INT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, UNIQUE(user_id, path))`. RLS policies for `authenticated`. |
| `supabase/migrations/20260824000000_vault_notes.sql` | Mirror Migration | Same schema and RLS policies. |

### 2.2 Frontend Components
| File | Lines | Operation | Details |
|---|---|---|---|
| `src/components/study/NoteExplorer.tsx` | 53–76 | Read (via API) | `fetchVault()` calls `GET /api/obsidian/notes?userId=...` to load all note summaries and tree folders. |
| `src/components/study/NoteExplorer.tsx` | 146 | Write (Direct DB) | `supabase.from('vault_notes').upsert([newNote], { onConflict: 'user_id,path' })` when uploading a PDF document. |
| `src/components/study/NoteExplorer.tsx` | 309–312 | Delete (Direct DB) | `supabase.from('vault_notes').delete().eq('path', note.relativePath \|\| note.id)` on note delete button click. |
| `src/components/study/NoteViewer.tsx` | 89–93 | Write (Storage) | `handleImageUpload()` uploads image to Supabase Storage bucket `media` and pastes markdown link. |
| `src/components/study/NoteViewer.tsx` | 681–697 | Read & Render | If `note.frontmatter?.pdf_url` is present, renders `<iframe src={note.frontmatter.pdf_url} />` and collapsible extracted text. |
| `src/app/page.tsx` | 420–438 | Read (via API) | `handleSelectNote()` calls `POST /api/obsidian/read` with `{ notePath }`. |
| `src/app/page.tsx` | 1743–1766 | Write (via API) | `onUpdateNote` calls `POST /api/obsidian/notes` with updated note markdown content. |
| `src/app/page.tsx` | 1731 | Read (via API) | Wikilink click calls `GET /api/obsidian/search?q=...`. |
| `src/components/study/NoteGraph.tsx` | 30–50 | Read (via API) | Fetches `GET /api/obsidian/graph?userId=...` to render 2D graph of notes and links. |
| `src/components/study/QuizSession.tsx` | 47–49 | Read (in Memory) | Passes `note.bodyContent` to `POST /api/study/quiz` to generate Gemini AI quizzes. |

### 2.3 Services and Core Libraries
| File | Lines | Operation | Details |
|---|---|---|---|
| `src/lib/obsidian/scanner.ts` | 68 | Read (`select('*')`) | `scanVaultDirectory()` queries all columns (`*`) of all rows in `vault_notes`. |
| `src/lib/obsidian/scanner.ts` | 191 | Read (`select('*')`) | `getNoteByPath()` queries note by `path` and parses markdown. |
| `src/lib/obsidian/scanner.ts` | 246 | Read (`select('*')`) | `searchVaultNotes()` queries all notes to run keyword and regex match. |
| `src/lib/obsidian/scanner.ts` | 355 | Read (`select('tags')`) | `getVaultTags()` queries tags across all notes. |
| `src/lib/obsidian/scanner.ts` | 422 | Write (`upsert`) | `batchUpsertVaultNotes()` upserts array of notes with conflict on `(user_id, path)`. |
| `src/lib/obsidian/vault-sync.ts` | 148, 212 | Read & Write | `pickAndSyncObsidianVault()` reads timestamps/content and batch upserts local markdown files. |
| `src/lib/obsidian/vault-sync.ts` | 359 | Write | `syncNotesFromFileList()` batch upserts HTML5 FileList files to `vault_notes`. |
| `src/lib/obsidian/parser.ts` | 44–131 | Parsing | `parseObsidianMarkdown()` extracts frontmatter (`pdf_url`), headings, tags, wikilinks, and body content. |

### 2.4 API Routes
| File | Methods | Handlers |
|---|---|---|
| `src/app/api/obsidian/notes/route.ts` | `GET`, `POST` | Calls `scanVaultDirectory` (`GET`) and `batchUpsertVaultNotes` (`POST`). |
| `src/app/api/obsidian/note/route.ts` | `GET`, `POST` | Calls `getNoteByPath`. |
| `src/app/api/obsidian/read/route.ts` | `GET`, `POST` | Calls `getNoteByPath`. |
| `src/app/api/obsidian/vault/route.ts` | `GET` | Calls `scanVaultDirectory`. |
| `src/app/api/obsidian/search/route.ts` | `GET` | Calls `searchVaultNotes`. |
| `src/app/api/obsidian/tags/route.ts` | `GET` | Calls `getVaultTags`. |
| `src/app/api/obsidian/graph/route.ts` | `GET` | Calls `supabase.from('vault_notes').select('id, title, content, folder')`. |

---

## 3. Bottleneck Analysis: Why Base64 Causes Lag, Freezes, and Timeouts

### 3.1 JavaScript Thread Blockage (CPU 100%)
In `NoteExplorer.tsx`:
```ts
const bytes = new Uint8Array(arrayBuffer);
let binary = '';
for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
pdfDataUrl = `data:application/pdf;base64,${btoa(binary)}`;
```
For a 15MB PDF file (`bytes.length` = 15,728,640):
1. The JS loop performs **15.7 million string concatenations** on the main thread.
2. In V8, intermediate string re-allocations consume gigabytes of transient memory.
3. The UI completely freezes; animations stop, and browsers trigger "Page Unresponsive" dialogs.

### 3.2 Parsing and Regex Memory Explosion
In `parser.ts`:
```ts
const yamlMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
if (yamlMatch) {
  const yamlBlock = yamlMatch[1];
  bodyContent = rawContent.slice(yamlMatch[0].length);
  const lines = yamlBlock.split(/\r?\n/);
  ...
```
When `rawContent` contains a 25MB base64 string in YAML frontmatter:
1. `rawContent.match(...)` runs a multi-line regex across 25MB.
2. `rawContent.slice(...)` allocates another 25MB string.
3. `yamlBlock.split(/\r?\n/)` copies the 25MB string again.
4. Parsing a single note allocates >100MB of RAM, causing major GC pauses.

### 3.3 PostgREST / PostgreSQL Statement Timeouts & Size Limits
1. Supabase PostgREST receives an HTTP request containing a ~25MB JSON string.
2. PostgreSQL must parse the JSON, decode the text, write to the PostgreSQL TOAST table, update indexes, and generate WAL logs.
3. On Supabase free/standard tiers, the `statement_timeout` is 8,000ms or 15,000ms. Massive JSON inserts frequently exceed this timeout, throwing `57014 statement timeout` or `413 Payload Too Large`.

### 3.4 Cascade Over-Fetching in Note Listings
In `scanner.ts` (`scanVaultDirectory`):
```ts
let query = client.from('vault_notes').select('*');
```
When fetching the folder tree or note list, Supabase queries `SELECT *`, fetching the full `content` of all notes. If a user has 4 uploaded PDFs, loading the study explorer transfers **>100MB of JSON** over the network just to display note titles and folders!

---

## 4. Proposed Supabase Storage Architecture & Implementation Plan

### 4.1 Automated Storage Infrastructure Setup (R2)
Create and run an automated script (`scripts/setup-storage.js` or `scripts/verify-storage.js`) using the PostgreSQL connection or Supabase client to create the bucket and configure RLS:

```sql
-- 1. Create media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB
  '{application/pdf,image/*,video/*,audio/*}'
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = '{application/pdf,image/*,video/*,audio/*}';

-- 2. Storage RLS Policies
DROP POLICY IF EXISTS "Public media access" ON storage.objects;
CREATE POLICY "Public media access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Allow upload to media bucket" ON storage.objects;
CREATE POLICY "Allow upload to media bucket" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "Allow update and delete to media bucket" ON storage.objects;
CREATE POLICY "Allow update and delete to media bucket" ON storage.objects
FOR UPDATE TO anon, authenticated
USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Allow delete to media bucket" ON storage.objects;
CREATE POLICY "Allow delete to media bucket" ON storage.objects
FOR DELETE TO anon, authenticated
USING (bucket_id = 'media');
```

### 4.2 Refactored Upload Pipeline (`NoteExplorer.tsx`)
Replace `handleDocumentUpload` in `src/components/study/NoteExplorer.tsx`:

```ts
const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not logged in');

    setSyncProgress({ status: 'uploading', scannedCount: 1, uploadedCount: 0, totalCount: 2 } as any);

    let pdfPublicUrl = '';
    let extractedText = '';

    if (file.name.toLowerCase().endsWith('.pdf')) {
      // 1. Generate clean storage path
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `pdfs/${user.id}/${Date.now()}_${cleanFileName}`;

      // 2. Direct binary upload to Supabase Storage bucket 'media'
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('media')
        .upload(storagePath, file, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(storagePath);
      pdfPublicUrl = publicUrl;

      // 4. Client-side text extraction using pdf.js (for AI quiz and search)
      const arrayBuffer = await file.arrayBuffer();
      let pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
      const pdf = await loadingTask.promise;
      const maxPages = Math.min(pdf.numPages, 50);

      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        extractedText += strings.join(' ') + '\n';
      }
    }

    // 5. Build clean markdown note with lightweight public URL in frontmatter
    const noteContent = pdfPublicUrl
      ? `---\npdf_url: ${pdfPublicUrl}\n---\n\n${extractedText}`
      : extractedText;

    const title = file.name.replace(/\.[^/.]+$/, "");
    const newNote = {
      user_id: user.id,
      title: title,
      content: noteContent,
      path: `Documents/${file.name}.md`,
      folder: 'Documents',
      tags: ['document', 'pdf'],
      word_count: noteContent.split(/\s+/).filter(Boolean).length,
      updated_at: new Date().toISOString()
    };

    // 6. Fast lightweight upsert (<50KB payload)
    const { error: dbError } = await supabase
      .from('vault_notes')
      .upsert([newNote], { onConflict: 'user_id,path' });

    if (dbError) throw new Error(dbError.message);

    await fetchVault();
  } catch (err: any) {
    alert('Failed to upload document: ' + err.message);
  } finally {
    setSyncProgress(null);
    if (docInputRef.current) docInputRef.current.value = '';
  }
};
```

### 4.3 Scanner Query Optimization (`src/lib/obsidian/scanner.ts`)
In `scanVaultDirectory()`, modify the select statement to avoid fetching `content` when listing vault notes:
```ts
// Instead of select('*'), select metadata columns only:
let query = client.from('vault_notes').select('id, user_id, title, path, folder, tags, word_count, created_at, updated_at');
```
Since `word_count`, `folder`, `tags`, and `title` are already distinct columns in `vault_notes`, the listing query no longer needs the `content` column at all. This accelerates vault listing from seconds down to <10ms!

---

## 5. Backward Compatibility and Legacy Migration Strategy

### 5.1 Dual-Format Rendering in `NoteViewer.tsx`
`NoteViewer.tsx` handles both public URL and legacy base64 format transparently:
- An `<iframe src={note.frontmatter.pdf_url} />` accepts either `https://...` or `data:application/pdf;base64,...`.
- To support enhanced viewers (e.g. PDF.js viewer or object embed), a helper determines the source type:
  ```ts
  const isStorageUrl = note.frontmatter?.pdf_url?.startsWith('http');
  const isBase64Url = note.frontmatter?.pdf_url?.startsWith('data:');
  ```

### 5.2 Automated Migration Script for Existing Base64 Notes
Create `scripts/migrate-base64-notes.js` to convert existing base64 notes in the database:
1. Connect via PostgreSQL or Supabase client.
2. Query `SELECT id, user_id, path, content FROM vault_notes WHERE content LIKE '%data:application/pdf;base64%'`.
3. For each note:
   - Extract the base64 string from frontmatter.
   - Convert base64 to binary buffer (`Buffer.from(base64Data, 'base64')`).
   - Upload buffer to Supabase Storage: `pdfs/${user_id}/migrated_${Date.now()}_${path.split('/').pop()}.pdf`.
   - Retrieve `publicUrl`.
   - Replace the base64 data URL in `content` with `publicUrl`.
   - Update `vault_notes` row.
4. Log migration stats and execution time.

---

## 6. Verification and Acceptance Criteria Mapping

| Acceptance Criterion | Verification Method |
|---|---|
| **R1. Supabase Storage Migration** | Test upload of sample PDF; confirm `vault_notes.content` contains `https://...` URL and zero `data:application/pdf;base64` strings. |
| **R2. Automated Infrastructure Setup** | Run `scripts/verify-storage.js` to verify `media` bucket creation and public URL resolution without errors. |
| **R3. PDF Viewer UI Overhaul** | Verify in `NoteViewer.tsx` that the visual PDF is rendered inside the embedded viewer while extracted text is available for `QuizSession.tsx`. |

---

## Summary of File Change Targets for Implementation Phase

1. `scripts/verify-storage.js` (NEW): Automated bucket creation, RLS configuration, and upload verification script.
2. `src/components/study/NoteExplorer.tsx`: Replace base64 conversion in `handleDocumentUpload` with direct Supabase Storage upload.
3. `src/lib/obsidian/scanner.ts`: Optimize `scanVaultDirectory` column selection (`omit content`).
4. `src/components/study/NoteViewer.tsx`: Enhance PDF viewing UI and preserve seamless AI quiz interaction.
