# Implementation Blueprint: Milestone M1_PDF_OVERHAUL

**Milestone**: M1_PDF_OVERHAUL — Supabase Storage Migration, Infrastructure Automation, & Visual PDF Study Suite  
**Author**: Implementation Blueprint Explorer (`explorer_m1`)  
**Target Execution Agent**: Worker  
**Project Root**: `d:\AI\جبنة\vibe-todos`  
**Date**: 2026-08-24  

---

## 1. Architecture Overview & Design Rationale

### 1.1 Root Cause of Current Failures
The legacy implementation converted multi-megabyte binary PDF files into raw base64 data URLs on the single-threaded browser main thread (`btoa(binary)`), embedded 10MB–50MB base64 strings in the YAML frontmatter (`--- \n pdf_url: data:application/pdf;base64,... \n ---`), and stored the entire payload into the PostgreSQL `TEXT` column `public.vault_notes.content`.

This caused three catastrophic failures:
1. **PostgreSQL Statement Timeouts (Code 57014)** & 413 Payload Errors during upserts.
2. **Main-Thread CPU Freezes (100% CPU lockup)** during string concatenation loops.
3. **Database Listing Over-Fetching**: Querying note listings (`scanVaultDirectory`) performed `SELECT *`, transferring tens of megabytes over the network on every page load.
4. **Disjointed Quiz UX**: Starting an AI quiz unmounted the note viewer, preventing students from referencing the visual document while solving questions.

### 1.2 Target Overhaul Architecture
```
[User Selects PDF]
       │
       ├──▶ [1. Direct Binary Upload] ──────────────▶ [Supabase Storage Bucket: 'media']
       │                                              (vault_pdfs/<userId>/<timestamp>_<cleanName>.pdf)
       │                                                              │
       │                                                              ▼
       │                                                    [Public CDN URL Generated]
       │                                                              │
       ├──▶ [2. Client-Side Text Extraction via pdf.js] ──────────────┤
       │    (Plain text up to 50 pages, 0 base64)                     │
       │                                                              ▼
       └──▶ [3. Fast Lightweight Upsert] ────────────▶ [PostgreSQL: public.vault_notes]
            (Payload < 50KB, YAML pdf_url: https://...)               │
                                                                      │
                      ┌───────────────────────────────────────────────┴─────────────────────────────┐
                      ▼                                                                             ▼
         [Desktop Dual-Pane Study View]                                               [Mobile Adaptive Tab View]
  ┌───────────────────────────────┬───────────────────────────────┐               ┌───────────────────────────────────────────┐
  │ Left Pane (55% width):        │ Right Pane (45% width):       │               │ Segmented Switcher: [📄 Doc] | [✨ Quiz]  │
  │ Visual PDF Document Viewer    │ Interactive AI Quiz Session   │               │ Smooth instant switching without state loss│
  │ - Native iframe (#toolbar=1)  │ - Pure note.bodyContent       │               └───────────────────────────────────────────┘
  │ - Fullscreen / Tab / Download │ - Gemini Flash 2.0 Evaluation │
  │ - Extracted Reader View toggle│ - Mascot & Socratic Hints     │
  └───────────────────────────────┴───────────────────────────────┘
```

---

## 2. File-by-File Implementation Blueprint

### File 1: `scripts/setup-storage.js`
* **Target File**: `d:\AI\جبنة\vibe-todos\scripts\setup-storage.js`
* **Role**: Automated, idempotent Node.js script using `pg` to provision the `media` storage bucket in `storage.buckets` and configure RLS policies on `storage.objects`.
* **Prerequisites**: `pg` package (^8.23.0) and ES module support.
* **Exact Code Content**:

```javascript
/**
 * Automated Supabase Storage Infrastructure Setup Script
 * 
 * Configures:
 * 1. storage.buckets 'media' bucket with public: true, 50MB limit.
 * 2. RLS policies on storage.objects for public SELECT and authenticated/anon INSERT, UPDATE, DELETE.
 */

import pg from 'pg';

const { Client } = pg;

const POSTGRES_CONN = process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  'postgresql://postgres.gbdwswfrscjccaaeciiu:Abdodragon66-_-_@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function setupStorage() {
  console.log('\n======================================================================');
  console.log('▶ PROVISIONING SUPABASE STORAGE: media bucket & RLS policies');
  console.log('======================================================================\n');

  const client = new Client({ connectionString: POSTGRES_CONN });

  try {
    await client.connect();
    console.log('✔ Connected to Supabase PostgreSQL database.');

    // Step 1: Idempotently create or update the media bucket
    console.log('[1/3] Ensuring "media" bucket exists in storage.buckets...');
    const bucketSql = `
      INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
      VALUES (
        'media',
        'media',
        true,
        false,
        52428800, -- 50MB
        null      -- Allow standard media & document mime types
      )
      ON CONFLICT (id) DO UPDATE SET
        public = true,
        avif_autodetection = false,
        file_size_limit = 52428800,
        allowed_mime_types = null;
    `;
    await client.query(bucketSql);
    console.log('  ✔ "media" bucket verified (public: true, limit: 50MB).');

    // Step 2: Enable RLS on storage.objects
    console.log('[2/3] Verifying RLS on storage.objects...');
    await client.query('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;');
    console.log('  ✔ RLS enabled on storage.objects.');

    // Step 3: Configure Idempotent Storage Policies on storage.objects
    console.log('[3/3] Configuring RLS policies on storage.objects for media bucket...');

    const policiesSql = `
      -- 1. Public Read / Select
      DROP POLICY IF EXISTS "Public media select" ON storage.objects;
      DROP POLICY IF EXISTS "Public media access" ON storage.objects;
      DROP POLICY IF EXISTS "Public Media Access" ON storage.objects;
      CREATE POLICY "Public media select"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'media');

      -- 2. Insert / Upload
      DROP POLICY IF EXISTS "Allow media insert" ON storage.objects;
      DROP POLICY IF EXISTS "Allow upload to media bucket" ON storage.objects;
      DROP POLICY IF EXISTS "Allow Media Uploads" ON storage.objects;
      CREATE POLICY "Allow media insert"
        ON storage.objects FOR INSERT
        TO anon, authenticated
        WITH CHECK (bucket_id = 'media');

      -- 3. Update
      DROP POLICY IF EXISTS "Allow media update" ON storage.objects;
      DROP POLICY IF EXISTS "Allow update to media bucket" ON storage.objects;
      DROP POLICY IF EXISTS "Allow Media Updates" ON storage.objects;
      CREATE POLICY "Allow media update"
        ON storage.objects FOR UPDATE
        TO anon, authenticated
        USING (bucket_id = 'media')
        WITH CHECK (bucket_id = 'media');

      -- 4. Delete
      DROP POLICY IF EXISTS "Allow media delete" ON storage.objects;
      DROP POLICY IF EXISTS "Allow delete to media bucket" ON storage.objects;
      DROP POLICY IF EXISTS "Allow Media Deletions" ON storage.objects;
      CREATE POLICY "Allow media delete"
        ON storage.objects FOR DELETE
        TO anon, authenticated
        USING (bucket_id = 'media');
    `;
    await client.query(policiesSql);
    console.log('  ✔ RLS policies created successfully (SELECT, INSERT, UPDATE, DELETE).');

    // Verify configuration
    const checkBucket = await client.query("SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'media';");
    const checkPolicies = await client.query("SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';");

    console.log('\n--- VERIFICATION SUMMARY ---');
    console.log('Bucket Status:', checkBucket.rows[0]);
    console.log('Configured Policies:', checkPolicies.rows.map(r => `${r.policyname} (${r.cmd})`));
    console.log('\n\x1b[32m✔ SUPABASE STORAGE SETUP COMPLETED SUCCESSFULLY!\x1b[0m\n');

  } catch (err) {
    console.error('\n\x1b[31m❌ SETUP FAILED:\x1b[0m', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupStorage();
```

---

### File 2: `scripts/verify-storage.js`
* **Target File**: `d:\AI\جبنة\vibe-todos\scripts\verify-storage.js`
* **Role**: Automated acceptance test script verifying bucket existence, binary upload, public URL generation, HTTP 200 GET reachability, payload integrity, and cleanup.
* **Exact Code Content**:

```javascript
/**
 * Storage Verification Acceptance Test Script
 * 
 * Verifies Acceptance Criteria:
 * 1. Uploads a mock probe file to Supabase Storage 'media' bucket.
 * 2. Resolves public URL via getPublicUrl.
 * 3. Executes HTTP GET to ensure status 200 OK and matching payload content.
 * 4. Cleans up probe artifact.
 * 5. Exits with code 0 on success, code 1 on failure.
 */

import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbdwswfrscjccaaeciiu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr';

async function verifyStorage() {
  console.log('\n======================================================================');
  console.log('▶ RUNNING SUPABASE STORAGE ACCEPTANCE VERIFICATION');
  console.log('======================================================================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const testId = Date.now();
  const probePath = `vault_pdfs/verification/probe_${testId}.txt`;
  const probeContent = `Vibe Todos Storage Probe Test Payload — Timestamp: ${new Date().toISOString()} — ID: ${testId}`;
  const probeBuffer = Buffer.from(probeContent, 'utf-8');

  try {
    // Step 1: Direct Binary Upload
    console.log(`[1/4] Uploading probe file to media bucket: ${probePath}...`);
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('media')
      .upload(probePath, probeBuffer, {
        contentType: 'text/plain',
        upsert: true
      });

    assert.strictEqual(uploadErr, null, `Upload failed: ${uploadErr?.message}`);
    assert.ok(uploadData, 'Upload response data must be defined');
    console.log('  ✔ Upload successful.');

    // Step 2: Retrieve Public URL
    console.log('[2/4] Resolving public URL...');
    const { data: urlData } = supabase.storage.from('media').getPublicUrl(probePath);
    const publicUrl = urlData?.publicUrl;

    assert.ok(publicUrl, 'Public URL must not be empty');
    assert.ok(publicUrl.startsWith('http'), `Public URL must be HTTP(S) protocol: ${publicUrl}`);
    console.log(`  ✔ Resolved Public URL: ${publicUrl}`);

    // Step 3: HTTP GET & Payload Integrity Check
    console.log('[3/4] Testing HTTP GET reachability and payload integrity...');
    const response = await fetch(publicUrl);
    assert.strictEqual(response.status, 200, `HTTP GET returned status ${response.status}, expected 200`);

    const fetchedContent = await response.text();
    assert.strictEqual(fetchedContent, probeContent, 'Fetched content must exactly match original probe payload');
    console.log('  ✔ HTTP 200 OK received with 100% content integrity.');

    // Step 4: Cleanup Probe File
    console.log(`[4/4] Cleaning up probe file (${probePath})...`);
    const { error: removeErr } = await supabase.storage.from('media').remove([probePath]);
    assert.strictEqual(removeErr, null, `Cleanup failed: ${removeErr?.message}`);
    console.log('  ✔ Probe file removed from bucket.');

    console.log('\n\x1b[32m✔ STORAGE VERIFICATION PASSED ALL ACCEPTANCE CRITERIA!\x1b[0m\n');
    process.exit(0);

  } catch (err) {
    console.error('\n\x1b[31m❌ STORAGE VERIFICATION FAILED:\x1b[0m', err);
    process.exit(1);
  }
}

verifyStorage();
```

---

### File 3: `scripts/migrate-base64-notes.js`
* **Target File**: `d:\AI\جبنة\vibe-todos\scripts\migrate-base64-notes.js`
* **Role**: Migration script that identifies existing oversized notes in `vault_notes` containing `data:application/pdf;base64,...` (e.g. `Documents/1.pdf.md` of 29.37 MB), uploads the decoded binary to Supabase Storage `media/vault_pdfs/`, and replaces the database row content with lightweight public URLs.
* **Exact Code Content**:

```javascript
/**
 * Base64 Database Cleansing & Supabase Storage Migration Script
 * 
 * Scans `vault_notes` for legacy base64-encoded PDF frontmatter,
 * uploads the binary PDF to Supabase Storage `media/vault_pdfs/`,
 * and replaces the multi-megabyte string with a lightweight public URL.
 */

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Client } = pg;

const POSTGRES_CONN = process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  'postgresql://postgres.gbdwswfrscjccaaeciiu:Abdodragon66-_-_@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbdwswfrscjccaaeciiu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr';

async function migrateBase64Notes() {
  console.log('\n======================================================================');
  console.log('▶ STARTING BASE64 TO SUPABASE STORAGE MIGRATION');
  console.log('======================================================================\n');

  const pgClient = new Client({ connectionString: POSTGRES_CONN });
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    await pgClient.connect();
    console.log('✔ Connected to Supabase PostgreSQL database.');

    // Query notes with base64 data URLs or size > 500KB
    const queryRes = await pgClient.query(`
      SELECT id, user_id, title, path, folder, tags, content, length(content) as content_length
      FROM public.vault_notes
      WHERE content LIKE '%data:application/pdf;base64%'
         OR content LIKE '%pdf_url:%data:%'
         OR length(content) > 500000;
    `);

    console.log(`Discovered ${queryRes.rows.length} candidate note(s) for migration.\n`);

    let migratedCount = 0;
    let totalBytesSaved = 0;

    for (const note of queryRes.rows) {
      const originalLen = parseInt(note.content_length, 10);
      const originalMb = (originalLen / (1024 * 1024)).toFixed(2);
      console.log(`Processing note "${note.path}" (ID: ${note.id}, Initial Size: ${originalMb} MB)...`);

      // Match base64 data URL
      const base64Regex = /pdf_url:\s*["']?data:application\/pdf;base64,([A-Za-z0-9+/=\s]+)["']?/;
      const match = note.content.match(base64Regex);

      if (!match) {
        console.log(`  ⚠ No base64 pattern matched in note "${note.path}". Skipping.`);
        continue;
      }

      const rawBase64 = match[1].replace(/\s+/g, '');
      const binaryBuffer = Buffer.from(rawBase64, 'base64');
      console.log(`  Decoded ${binaryBuffer.length} bytes of binary PDF data.`);

      // Generate clean storage path
      const baseFileName = (note.path.split('/').pop() || 'document.pdf')
        .replace(/\.md$/i, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `vault_pdfs/${note.user_id || 'system'}/${Date.now()}_${baseFileName}`;

      // Upload binary buffer to Supabase Storage
      console.log(`  Uploading to Supabase Storage: media/${storagePath}...`);
      const { error: uploadErr } = await supabase.storage
        .from('media')
        .upload(storagePath, binaryBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadErr) {
        console.error(`  ❌ Failed to upload to Supabase Storage: ${uploadErr.message}`);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(storagePath);
      console.log(`  ✔ Uploaded. Public URL: ${publicUrl}`);

      // Replace base64 URL with public URL in note content
      const updatedContent = note.content.replace(
        base64Regex,
        `pdf_url: "${publicUrl}"`
      );

      const newLen = Buffer.byteLength(updatedContent, 'utf-8');
      const bytesSaved = originalLen - newLen;
      const newKb = (newLen / 1024).toFixed(2);

      // Update database row
      await pgClient.query(`
        UPDATE public.vault_notes
        SET content = $1,
            word_count = $2,
            updated_at = now()
        WHERE id = $3;
      `, [
        updatedContent,
        updatedContent.split(/\s+/).filter(Boolean).length,
        note.id
      ]);

      console.log(`  ✔ Successfully updated database row: Size reduced from ${originalMb} MB to ${newKb} KB (${((bytesSaved / originalLen) * 100).toFixed(2)}% reduction).\n`);
      migratedCount++;
      totalBytesSaved += bytesSaved;
    }

    const totalMbSaved = (totalBytesSaved / (1024 * 1024)).toFixed(2);
    console.log('======================================================================');
    console.log(`✔ MIGRATION COMPLETE: Migrated ${migratedCount} note(s), freed ${totalMbSaved} MB of database space.`);
    console.log('======================================================================\n');

  } catch (err) {
    console.error('\n\x1b[31m❌ MIGRATION FAILED:\x1b[0m', err);
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

migrateBase64Notes();
```

---

### File 4: `src/components/study/NoteExplorer.tsx` & `src/components/vault/NoteExplorer.tsx`
* **Target Files**:
  - `d:\AI\جبنة\vibe-todos\src\components\study\NoteExplorer.tsx` (primary)
  - `d:\AI\جبنة\vibe-todos\src\components\vault\NoteExplorer.tsx` (re-export / alias for backward & forward compatibility)
* **Modifications**:
  1. Replace `handleDocumentUpload` implementation to:
     - Directly upload binary `file` to `supabase.storage.from('media').upload(...)`.
     - Retrieve `publicUrl`.
     - Extract clean text via `pdf.js` (up to 50 pages) without binary base64 loop.
     - Store YAML frontmatter `pdf_url: "${publicUrl}"`.
     - Upsert note with <50KB payload.
  2. Maintain progress tracking and error handling.
* **Exact Code Implementation for `src/components/study/NoteExplorer.tsx`**:

```tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Search, 
  RotateCw, 
  Clock, 
  ChevronRight, 
  ChevronDown, 
  AlertCircle, 
  Cloud, 
  UploadCloud, 
  Loader2 
} from 'lucide-react';
import type { ObsidianNoteSummary, VaultScanSummary } from '@/types/obsidian';
import { pickAndSyncObsidianVault, syncNotesFromFileList, type SyncProgress } from '@/lib/obsidian/vault-sync';
import { createClient } from '@/lib/supabase/client';

interface NoteExplorerProps {
  userId?: string;
  scopedFolder?: string;
  scopedTags?: string[];
  selectedNoteId?: string | null;
  onSelectNote: (note: ObsidianNoteSummary) => void;
  isDark?: boolean;
  onRefresh?: () => void;
}

export default function NoteExplorer({
  userId,
  scopedFolder,
  scopedTags,
  selectedNoteId,
  onSelectNote,
  isDark = true,
  onRefresh
}: NoteExplorerProps) {
  const supabase = createClient();
  const [notes, setNotes] = useState<ObsidianNoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const fetchVault = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (userId) params.set('userId', userId);
      const res = await fetch(`/api/obsidian/notes?${params.toString()}`);
      const data: VaultScanSummary = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load cloud vault');
      
      setNotes(data.notes || []);
      
      // Auto-expand root folders initially
      const initialExpanded: Record<string, boolean> = {};
      const uniqueFolders = Array.from(new Set((data.notes || []).map(n => n.folder || 'Root')));
      uniqueFolders.forEach(f => { initialExpanded[f] = true; });
      setExpandedFolders(initialExpanded);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchVault(); }, [fetchVault]);

  /**
   * High-Performance Direct Supabase Storage PDF & Document Ingestion
   */
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || userId || '27157bfd-443f-4eea-8431-bf58a74bae8b';

      setSyncProgress({ status: 'uploading', scannedCount: 1, uploadedCount: 0, totalCount: 2 } as any);

      let pdfPublicUrl = '';
      let extractedText = '';

      if (file.name.toLowerCase().endsWith('.pdf')) {
        // 1. Upload binary PDF directly to Supabase Storage 'media' bucket
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `vault_pdfs/${currentUserId}/${Date.now()}_${cleanFileName}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('media')
          .upload(storagePath, file, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadErr) {
          throw new Error(`Storage upload failed: ${uploadErr.message}`);
        }

        // 2. Retrieve Public CDN URL
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(storagePath);
        pdfPublicUrl = publicUrl;
        setSyncProgress({ status: 'uploading', scannedCount: 1, uploadedCount: 1, totalCount: 2 } as any);

        // 3. Extract text client-side via pdf.js (for AI Quizzes and search index)
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

        if (pdf.numPages > 50) {
          extractedText += `\n\n... (Extracted first 50 pages of document for search and AI quizzes)`;
        }
      }

      // 4. Construct clean Markdown note with lightweight public URL in frontmatter
      const title = file.name.replace(/\.[^/.]+$/, '');
      const noteContent = pdfPublicUrl
        ? `---\ntitle: "${title}"\ntype: "pdf"\npdf_url: "${pdfPublicUrl}"\nfile_name: "${file.name}"\nuploaded_at: "${new Date().toISOString()}"\n---\n\n${extractedText}`
        : extractedText;

      const newNote = {
        user_id: currentUserId,
        title: title,
        content: noteContent,
        path: `Documents/${file.name}.md`,
        folder: 'Documents',
        tags: ['document', 'pdf'],
        word_count: extractedText.split(/\s+/).filter(Boolean).length,
        updated_at: new Date().toISOString()
      };

      // 5. Fast, lightweight database upsert (<50KB payload)
      const { error: dbError } = await supabase
        .from('vault_notes')
        .upsert([newNote], { onConflict: 'user_id,path' });

      if (dbError) throw new Error(dbError.message);

      await fetchVault();
      onRefresh?.();
    } catch (err: any) {
      console.error('Document upload error:', err);
      alert('Failed to upload document: ' + err.message);
    } finally {
      setSyncProgress(null);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleConnectVault = async () => {
    if (!(window as any).showDirectoryPicker) {
      fileInputRef.current?.click();
      return;
    }
    try {
      setIsSyncing(true);
      setError(null);
      await pickAndSyncObsidianVault(userId, setSyncProgress);
      await fetchVault();
      onRefresh?.();
    } catch (err: any) {
      if (err.name !== 'AbortError') setError('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleFallbackFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      setIsSyncing(true);
      setError(null);
      await syncNotesFromFileList(e.target.files, userId, setSyncProgress);
      await fetchVault();
      onRefresh?.();
    } catch (err: any) {
      setError('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.tags?.some(t => t.toLowerCase().includes(q));
      }
      return true;
    });
  }, [notes, searchQuery]);

  const tree = useMemo(() => {
    const grouped: Record<string, ObsidianNoteSummary[]> = {};
    filteredNotes.forEach(n => {
      const folder = n.folder || 'Root';
      if (!grouped[folder]) grouped[folder] = [];
      grouped[folder].push(n);
    });
    return grouped;
  }, [filteredNotes]);

  return (
    <div className="flex flex-col h-full w-full font-sans" data-spatial-container="study-explorer">
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" {...{webkitdirectory: "", directory: ""}} multiple className="hidden" onChange={handleFallbackFileSelect} />
      <input type="file" accept=".pdf,.doc,.docx" ref={docInputRef} className="hidden" onChange={handleDocumentUpload} />

      {/* Search and Action Toolbar */}
      <div className="relative flex items-center mb-4 gap-2">
        <div className="relative flex-1">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or tags..."
            className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border outline-none transition-all ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-purple-500' : 'bg-white border-gray-200 text-gray-800 focus:border-purple-500'
            }`}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button 
            onClick={fetchVault} 
            className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`} 
            title="Refresh Vault"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button 
            onClick={() => docInputRef.current?.click()} 
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all text-xs font-bold" 
            title="Upload PDF Document"
          >
            <UploadCloud size={14} />
            <span>PDF</span>
          </button>
          
          <button 
            onClick={handleConnectVault} 
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all text-xs font-bold" 
            title="Sync local folder to cloud"
          >
            <RotateCw size={14} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Syncing / Upload Progress Notification */}
      {isSyncing && syncProgress && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 text-xs font-semibold ${isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
          <Loader2 size={16} className="animate-spin flex-shrink-0" />
          <div className="truncate">
            {syncProgress.status === 'picking' ? 'Selecting folder...' :
             syncProgress.status === 'scanning' ? `Scanning local vault (${syncProgress.scannedCount} files)...` :
             `Uploading to Cloud: ${syncProgress.uploadedCount} / ${syncProgress.totalCount}...`}
          </div>
        </div>
      )}

      {/* Notes Tree Listing */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {loading ? (
          <div className="flex items-center justify-center h-20 opacity-50"><Loader2 className="animate-spin" size={20} /></div>
        ) : error ? (
          <div className={`p-4 rounded-xl text-center text-xs ${isDark ? 'bg-red-950/20 text-red-400' : 'bg-red-50 text-red-600'}`}>{error}</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center p-6 opacity-50 text-xs font-medium">No notes found. Upload a PDF or sync your vault to start!</div>
        ) : (
          <div className="space-y-6 pb-6">
            {Object.entries(tree).sort((a,b) => a[0].localeCompare(b[0])).map(([folder, folderNotes]) => (
              <div key={folder}>
                <div className="flex items-center gap-2 mb-3 pl-1">
                  <FolderOpen size={16} className={isDark ? 'text-indigo-400' : 'text-indigo-500'} />
                  <h4 className={`text-sm font-bold tracking-tight ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{folder}</h4>
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>{folderNotes.length}</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {folderNotes.map(note => {
                    const isSelected = selectedNoteId === note.id || selectedNoteId === note.relativePath;
                    return (
                      <div key={note.id} className="relative group/note w-full">
                        <button
                          onClick={() => onSelectNote(note)}
                          className={`w-full flex flex-col items-start text-left p-3.5 rounded-2xl transition-all duration-300 border ${
                            isSelected 
                              ? (isDark ? 'bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-indigo-50 border-indigo-200 shadow-sm scale-[0.98]') 
                              : (isDark ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm')
                          }`}
                        >
                          <div className="w-full flex justify-between items-start mb-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                              isSelected 
                                ? (isDark ? 'bg-indigo-500/30' : 'bg-indigo-100') 
                                : (isDark ? 'bg-slate-700/50 group-hover:bg-slate-700' : 'bg-gray-50 group-hover:bg-gray-100')
                            }`}>
                              <FileText size={18} className={isSelected ? 'text-indigo-500' : (isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-gray-400 group-hover:text-gray-600')} />
                            </div>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm('Delete this note?')) return;
                                try {
                                  const deleteQuery = supabase.from('vault_notes').delete().eq('path', note.relativePath || note.id);
                                  if (userId) deleteQuery.eq('user_id', userId);
                                  const { error: deleteError } = await deleteQuery;
                                  if (deleteError) throw new Error(deleteError.message);
                                  await fetchVault();
                                } catch (err: any) {
                                  alert('Failed to delete: ' + err.message);
                                }
                              }}
                              className={`p-1.5 rounded-lg opacity-0 group-hover/note:opacity-100 transition-all ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                              title="Delete note"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                          </div>
                          <h5 className={`text-xs font-bold truncate w-full mb-1 ${isSelected ? (isDark ? 'text-indigo-300' : 'text-indigo-700') : (isDark ? 'text-slate-300 group-hover:text-white' : 'text-gray-800')}`}>{note.title}</h5>
                          {note.tags && note.tags.length > 0 && (
                            <span className={`text-[9px] font-bold uppercase tracking-wider truncate w-full mt-auto ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                              {note.tags.join(', ')}
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

* **Code for `src/components/vault/NoteExplorer.tsx`** (forwarding re-export):
```tsx
export { default } from '@/components/study/NoteExplorer';
```

---

### File 5: `src/components/study/NoteViewer.tsx` & `src/components/vault/NoteViewer.tsx`
* **Target Files**:
  - `d:\AI\جبنة\vibe-todos\src\components\study\NoteViewer.tsx` (primary)
  - `d:\AI\جبنة\vibe-todos\src\components\vault\NoteViewer.tsx` (re-export)
* **Modifications**:
  1. Overhaul the PDF rendering section:
     - Dedicated PDF action toolbar:
       - **Fullscreen Toggle** (`Maximize2` / `Minimize2`): provides an expansive study viewport.
       - **Open in New Tab** (`ExternalLink`): opens the direct Supabase Storage public URL.
       - **Download** (`Download`): downloads the source PDF file directly.
       - **Reader View Toggle** (`BookOpen` / `FileText`): lets user switch seamlessly between visual PDF mode and clean extracted markdown text mode.
       - **Copy Link** (`Copy` / `Check`): copies the direct document link.
     - Responsive `<iframe>` embed with hardware acceleration and `#toolbar=1&navpanes=1&view=FitH`.
     - Fallback `<object>` embed for mobile compatibility.
     - Extracted text accordion for AI quiz inspection.
* **Exact Code Implementation for `src/components/study/NoteViewer.tsx`**:

```tsx
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { 
  BookOpen, 
  Sparkles, 
  Tag, 
  Calendar, 
  Clock, 
  ListTree, 
  Copy, 
  Check, 
  ExternalLink, 
  Download,
  FileText, 
  ArrowLeft, 
  Folder, 
  CheckCircle2, 
  AlertCircle,
  Code, 
  Layers, 
  Maximize2, 
  Minimize2,
  Image as ImageIcon, 
  Loader2 
} from 'lucide-react';
import type { ParsedObsidianNote } from '@/types/obsidian';

interface NoteViewerProps {
  note: ParsedObsidianNote | null;
  isLoading?: boolean;
  onClose?: () => void;
  onWikilinkClick?: (target: string) => void;
  onStartQuiz?: (note: ParsedObsidianNote) => void;
  onUpdateNote?: (updatedContent: string) => void;
  isDark?: boolean;
  hideTopHeader?: boolean; // For dual-pane embedding
}

export default function NoteViewer({
  note,
  isLoading = false,
  onClose,
  onWikilinkClick,
  onStartQuiz,
  onUpdateNote,
  isDark = true,
  hideTopHeader = false
}: NoteViewerProps) {
  const [showOutline, setShowOutline] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCodeBlockIdx, setCopiedCodeBlockIdx] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchContent, setScratchContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);
  const [pdfViewMode, setPdfViewMode] = useState<'pdf' | 'reader'>('pdf');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    setEditContent(note?.bodyContent || '');
    setIsEditing(false);
    setPdfViewMode('pdf');
    setIsPdfFullscreen(false);
    
    if (note) {
      setScratchContent(localStorage.getItem(`scratch_${note.id}`) || '');
    }
  }, [note?.id, note?.bodyContent]);

  const handleScratchChange = (val: string) => {
    setScratchContent(val);
    if (note) localStorage.setItem(`scratch_${note.id}`, val);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data, error } = await supabase.storage.from('media').upload(fileName, file);

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
      
      const markdownImage = `\n![${file.name}](${publicUrl})\n`;
      setEditContent(prev => prev + markdownImage);
      if (onUpdateNote) onUpdateNote(editContent + markdownImage);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please check your connection.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyMarkdown = async () => {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(note.bodyContent || note.rawContent || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const copyDocumentUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const copyCode = async (codeStr: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(codeStr);
      setCopiedCodeBlockIdx(idx);
      setTimeout(() => setCopiedCodeBlockIdx(null), 2000);
    } catch {
      // ignore
    }
  };

  const scrollToHeading = (slug: string) => {
    const el = document.getElementById(slug);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const readingTime = useMemo(() => {
    if (!note || !note.wordCount) return 1;
    return Math.max(1, Math.ceil(note.wordCount / 200));
  }, [note]);

  // Clean Markdown Renderer helper
  const renderMarkdownContent = (markdownText: string) => {
    if (!markdownText) return null;

    const lines = markdownText.split(/\r?\n/);
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];
    let codeBlockCount = 0;
    let listBuffer: string[] = [];
    let inList = false;

    const flushList = () => {
      if (inList && listBuffer.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-3 space-y-1.5 list-disc list-inside pl-2 text-sm leading-relaxed">
            {listBuffer.map((item, idx) => (
              <li key={idx} className={isDark ? 'text-slate-200' : 'text-gray-800'}>
                {renderInlineFormattedText(item)}
              </li>
            ))}
          </ul>
        );
        listBuffer = [];
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith('```')) {
        flushList();
        if (inCodeBlock) {
          const blockCode = codeBuffer.join('\n');
          const blockIdx = codeBlockCount++;
          const lang = codeLanguage;
          elements.push(
            <div key={`code-${blockIdx}`} className="my-4 rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950/80 shadow-lg">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 uppercase font-bold text-purple-400">
                  <Code size={12} /> {lang || 'text'}
                </span>
                <button
                  type="button"
                  onClick={() => copyCode(blockCode, blockIdx)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {copiedCodeBlockIdx === blockIdx ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  <span>{copiedCodeBlockIdx === blockIdx ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto custom-scrollbar">
                <code>{blockCode}</code>
              </pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
          codeLanguage = '';
        } else {
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushList();
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const slug = text
          .toLowerCase()
          .replace(/[^\w\s\u0600-\u06FF-]/g, '')
          .replace(/\s+/g, '-');

        const headingClasses = {
          1: 'text-2xl sm:text-3xl font-extrabold mt-6 mb-3 tracking-tight text-purple-400 dark:text-purple-300 border-b border-purple-500/20 pb-2',
          2: 'text-xl sm:text-2xl font-bold mt-5 mb-2.5 tracking-tight text-white dark:text-slate-100',
          3: 'text-lg sm:text-xl font-semibold mt-4 mb-2 text-purple-300 dark:text-purple-200',
          4: 'text-base sm:text-lg font-semibold mt-3.5 mb-1.5 text-slate-200',
          5: 'text-sm font-semibold mt-3 mb-1 text-slate-300',
          6: 'text-xs font-semibold mt-2.5 mb-1 text-slate-400'
        }[level] || 'text-base font-bold mt-3 mb-1';

        elements.push(
          <div key={`heading-${i}`} id={slug} className="scroll-mt-6">
            {React.createElement(
              `h${level}`,
              { className: headingClasses },
              renderInlineFormattedText(text)
            )}
          </div>
        );
        continue;
      }

      if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
        flushList();
        elements.push(
          <hr key={`hr-${i}`} className={`my-5 border-t ${isDark ? 'border-slate-800' : 'border-gray-200'}`} />
        );
        continue;
      }

      if (line.trim().startsWith('>')) {
        flushList();
        const calloutText = line.trim().replace(/^>\s?/, '');
        const isAdmonition = calloutText.startsWith('[!');

        let admonitionType = 'NOTE';
        let bodyText = calloutText;
        if (isAdmonition) {
          const match = calloutText.match(/^\[!([A-Z]+)\]\s?(.*)$/i);
          if (match) {
            admonitionType = match[1].toUpperCase();
            bodyText = match[2];
          }
        }

        elements.push(
          <div
            key={`quote-${i}`}
            className={`my-3.5 p-4 rounded-2xl border-l-4 shadow-sm ${
              admonitionType === 'WARNING' || admonitionType === 'CAUTION'
                ? 'bg-amber-950/20 border-amber-500 text-amber-200'
                : admonitionType === 'TIP' || admonitionType === 'SUCCESS'
                  ? 'bg-emerald-950/20 border-emerald-500 text-emerald-200'
                  : 'bg-purple-950/20 border-purple-500 text-purple-200'
            }`}
          >
            {isAdmonition && (
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider mb-1">
                <AlertCircle size={14} />
                <span>{admonitionType}</span>
              </div>
            )}
            <div className="text-xs sm:text-sm leading-relaxed">
              {renderInlineFormattedText(bodyText || calloutText)}
            </div>
          </div>
        );
        continue;
      }

      const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        inList = true;
        listBuffer.push(listMatch[3]);
        continue;
      } else {
        flushList();
      }

      if (!line.trim()) continue;

      elements.push(
        <p key={`p-${i}`} className={`my-2 text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          {renderInlineFormattedText(line)}
        </p>
      );
    }

    flushList();
    return elements;
  };

  const renderInlineFormattedText = (text: string) => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      const wikiMatch = remaining.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      const codeMatch = remaining.match(/`([^`]+)`/);
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      const tagMatch = remaining.match(/(?:^|[\s,;:(])#([a-zA-Z0-9_\-\u0600-\u06FF]+)/);

      const matches = [
        wikiMatch ? { type: 'wiki', match: wikiMatch, index: wikiMatch.index! } : null,
        codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
        boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
        tagMatch ? { type: 'tag', match: tagMatch, index: tagMatch.index! } : null,
      ].filter(Boolean) as { type: string; match: RegExpMatchArray; index: number }[];

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      matches.sort((a, b) => a.index - b.index);
      const first = matches[0];

      if (first.index > 0) {
        parts.push(remaining.slice(0, first.index));
      }

      const matchStr = first.match[0];
      const matchLen = matchStr.length;

      if (first.type === 'wiki') {
        const target = first.match[1].trim();
        const alias = first.match[2]?.trim() || target;
        parts.push(
          <button
            key={`wiki-${keyIdx++}`}
            type="button"
            onClick={() => onWikilinkClick && onWikilinkClick(target)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 transition-all text-[11px] sm:text-xs"
            title={`Navigate to note: ${target}`}
          >
            <BookOpen size={10} className="text-purple-400 flex-shrink-0" />
            <span>{alias}</span>
          </button>
        );
      } else if (first.type === 'code') {
        parts.push(
          <code key={`code-${keyIdx++}`} className="px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] sm:text-xs bg-slate-800 text-purple-300 border border-slate-700/80">
            {first.match[1]}
          </code>
        );
      } else if (first.type === 'bold') {
        parts.push(
          <strong key={`bold-${keyIdx++}`} className="font-bold text-white dark:text-slate-100">
            {first.match[1]}
          </strong>
        );
      } else if (first.type === 'tag') {
        const tagText = first.match[1];
        parts.push(
          <span key={`tag-${keyIdx++}`} className="inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded-md font-medium text-[10px] sm:text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/20">
            #{tagText}
          </span>
        );
      }

      remaining = remaining.slice(first.index + matchLen);
    }

    return parts;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400 animate-pulse">Loading note content...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className={`p-10 rounded-3xl border border-dashed text-center flex flex-col items-center justify-center ${
        isDark ? 'border-slate-800 bg-slate-900/30 text-slate-400' : 'border-gray-200 bg-gray-50 text-gray-500'
      }`}>
        <BookOpen size={40} className="opacity-30 mb-3 text-purple-400" />
        <h3 className="text-base font-bold mb-1">Select a Note to Read</h3>
        <p className="text-xs max-w-xs opacity-75">
          Choose any note from the Explorer on the left to read its markdown content, tags, outline, and launch AI study quizzes.
        </p>
      </div>
    );
  }

  const pdfUrl = note.frontmatter?.pdf_url;

  return (
    <div className="flex flex-col h-full w-full relative font-sans" data-spatial-container="study-viewer">
      {/* Top Floating Action Bar */}
      {!hideTopHeader && (
        <div className={`flex items-center justify-between pb-4 mb-4 border-b ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-all active:scale-95 ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}

            <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold truncate max-w-[200px] sm:max-w-xs">
              <Folder size={13} className="flex-shrink-0" />
              <span className="truncate">{note.folder || 'Vault'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Outline Toggle */}
            {note.headings && note.headings.length > 0 && (
              <button
                type="button"
                onClick={() => setShowOutline(!showOutline)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  showOutline
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : isDark
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
                title="Table of contents outline"
              >
                <ListTree size={14} />
                <span className="hidden sm:inline">Outline</span>
              </button>
            )}

            {/* Edit / Save Action */}
            {onUpdateNote && !pdfUrl && (
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    onUpdateNote(editContent);
                    setIsEditing(false);
                  } else {
                    setIsEditing(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  isEditing 
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-md shadow-green-600/30' 
                    : isDark 
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isEditing ? <Check size={14} /> : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>}
                <span>{isEditing ? 'Save Note' : 'Edit Note'}</span>
              </button>
            )}

            {/* Scratchpad Toggle */}
            <button
              type="button"
              onClick={() => setShowScratchpad(!showScratchpad)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                showScratchpad 
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' 
                  : isDark 
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
              <span className="hidden sm:inline">Scratchpad</span>
            </button>

            {/* Copy Markdown */}
            <button
              type="button"
              onClick={copyMarkdown}
              className={`p-2 rounded-xl transition-all active:scale-95 ${
                isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Copy Note Markdown"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>

            {/* Start Quiz Action */}
            {onStartQuiz && (
              <button
                type="button"
                onClick={() => onStartQuiz(note)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all active:scale-95"
              >
                <Sparkles size={14} />
                <span>AI Quiz</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Note Header Info: Title & Frontmatter Badges */}
      {!hideTopHeader && (
        <div className={`p-5 rounded-3xl mb-5 border shadow-sm ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 mb-3">
            {note.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium ${
              isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'
            }`}>
              <Clock size={12} className="text-purple-400" />
              {note.wordCount} words (~{readingTime} min read)
            </span>

            {pdfUrl && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                <FileText size={12} />
                PDF Document
              </span>
            )}

            {note.frontmatter?.status && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-semibold bg-green-500/15 text-green-400 border border-green-500/20">
                <CheckCircle2 size={12} />
                {note.frontmatter.status}
              </span>
            )}

            {note.frontmatter?.created && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium ${
                isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
              }`}>
                <Calendar size={12} />
                {note.frontmatter.created}
              </span>
            )}
          </div>

          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-dashed border-slate-800 dark:border-slate-800/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Tag size={11} /> Tags:
              </span>
              {note.tags.map(t => (
                <span
                  key={t}
                  className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Document & Outline Body */}
      <div className="flex-1 flex flex-col md:flex-row gap-5 min-h-0">
        {/* Scratchpad Panel */}
        {showScratchpad && (
          <div className={`w-full md:w-1/3 flex-shrink-0 flex flex-col p-4 rounded-3xl border transition-all ${isDark ? 'bg-amber-950/20 border-amber-500/30 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 opacity-70">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
              Scratchpad
            </h4>
            <textarea
              dir="auto"
              placeholder="Jot down rough notes, translations, or ideas here..."
              value={scratchContent}
              onChange={(e) => handleScratchChange(e.target.value)}
              className="flex-1 w-full bg-transparent resize-none outline-none text-sm leading-relaxed custom-scrollbar"
            />
          </div>
        )}

        {/* Visual Document / Markdown Container */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden" dir="auto">
          {isEditing ? (
            <textarea
              dir="auto"
              className={`w-full min-h-[500px] h-full resize-none bg-transparent outline-none p-4 rounded-2xl border ${isDark ? 'border-slate-700 text-slate-200' : 'border-gray-300 text-gray-800'}`}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Start typing markdown..."
              spellCheck={false}
            />
          ) : pdfUrl ? (
            <div className={`flex flex-col w-full h-full space-y-3 ${isPdfFullscreen ? 'fixed inset-0 z-50 p-6 bg-slate-950/95 backdrop-blur-xl' : ''}`}>
              {/* PDF Toolbar Header */}
              <div className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border shadow-sm ${
                isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white border-gray-200 text-gray-700'
              }`}>
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-purple-400 flex-shrink-0" />
                  <span className="text-xs font-bold truncate max-w-[200px] sm:max-w-xs">{note.title}</span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  {/* View Mode Toggle: Visual PDF vs Extracted Text */}
                  <button
                    type="button"
                    onClick={() => setPdfViewMode(pdfViewMode === 'pdf' ? 'reader' : 'pdf')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      pdfViewMode === 'reader'
                        ? 'bg-purple-600 text-white'
                        : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                    title="Toggle Reader Mode"
                  >
                    {pdfViewMode === 'pdf' ? <BookOpen size={13} /> : <FileText size={13} />}
                    <span className="hidden sm:inline">{pdfViewMode === 'pdf' ? 'Reader View' : 'PDF View'}</span>
                  </button>

                  {/* Copy Link */}
                  <button
                    type="button"
                    onClick={() => copyDocumentUrl(pdfUrl)}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                    title="Copy Document URL"
                  >
                    {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>

                  {/* Open in New Tab */}
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                    title="Open in new window"
                  >
                    <ExternalLink size={13} />
                    <span className="hidden sm:inline">New Tab</span>
                  </a>

                  {/* Direct Download */}
                  <a
                    href={pdfUrl}
                    download={note.title || 'document.pdf'}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                    title="Download PDF"
                  >
                    <Download size={14} />
                  </a>

                  {/* Fullscreen Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsPdfFullscreen(!isPdfFullscreen)}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                    title={isPdfFullscreen ? "Exit Fullscreen" : "Fullscreen Viewer"}
                  >
                    {isPdfFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </div>
              </div>

              {/* Main Visual Frame or Reader Mode */}
              {pdfViewMode === 'pdf' ? (
                <div className="flex-1 w-full min-h-[550px] relative rounded-2xl overflow-hidden border shadow-inner border-slate-700/60 bg-slate-900">
                  <iframe
                    src={`${pdfUrl}#toolbar=1&navpanes=1&view=FitH`}
                    className="w-full h-full min-h-[550px] border-0"
                    title={note.title}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 rounded-2xl border border-slate-800 bg-slate-900/60 text-slate-200">
                  {renderMarkdownContent(editContent)}
                </div>
              )}

              {/* Extracted Text Accordion for AI Quizzing Verification */}
              {pdfViewMode === 'pdf' && (
                <details className={`p-3 rounded-xl border transition-all ${isDark ? 'bg-slate-900/30 border-slate-800 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider select-none outline-none flex items-center justify-between">
                    <span>Show Extracted Text (For AI Quizzes & Search)</span>
                    <span className="text-[10px] lowercase font-normal">{note.wordCount} words</span>
                  </summary>
                  <div className="mt-4 opacity-80 text-sm max-h-60 overflow-y-auto custom-scrollbar">
                    {renderMarkdownContent(editContent)}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {renderMarkdownContent(editContent)}
            </div>
          )}

          {/* Bidirectional Wikilinks Footer */}
          {note.wikilinks && note.wikilinks.length > 0 && !pdfUrl && (
            <div className="mt-8 pt-5 border-t border-dashed border-purple-500/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-1.5">
                <Layers size={13} /> Connected Knowledge Nodes ({note.wikilinks.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {note.wikilinks.map((link, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onWikilinkClick && onWikilinkClick(link.target)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all active:scale-95"
                  >
                    <BookOpen size={12} className="text-purple-400" />
                    <span>{link.alias || link.target}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Outline Table of Contents Drawer */}
        <AnimatePresence>
          {showOutline && note.headings && note.headings.length > 0 && (
            <motion.aside
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 240 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className={`p-4 rounded-3xl border overflow-y-auto custom-scrollbar flex-shrink-0 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                  <ListTree size={13} /> Outline (H1-H6)
                </h4>
                <button
                  type="button"
                  onClick={() => setShowOutline(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <nav className="space-y-1.5">
                {note.headings.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToHeading(h.slug)}
                    style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
                    className={`w-full text-left py-1 text-xs rounded-lg transition-colors truncate block ${
                      h.level === 1
                        ? 'font-bold text-purple-300 hover:text-white hover:bg-purple-500/20'
                        : isDark
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

* **Code for `src/components/vault/NoteViewer.tsx`** (forwarding re-export):
```tsx
export { default } from '@/components/study/NoteViewer';
```

---

### File 6: `src/app/page.tsx`, `src/components/study/QuizSession.tsx` & `src/app/vault/page.tsx`
* **Target Files**:
  - `d:\AI\جبنة\vibe-todos\src\app\page.tsx` (Study workspace section around line 1700)
  - `d:\AI\جبنة\vibe-todos\src\components\study\QuizSession.tsx` (Quiz UI side-by-side optimization)
  - `d:\AI\جبنة\vibe-todos\src\app\vault\page.tsx` (Vault direct route re-export / page)
* **Modifications**:

#### 6.1 `src/app/page.tsx` Dual-Pane Layout Update:
Replace lines 1702–1760 in `src/app/page.tsx` with:

```tsx
{/* Study UI: Side-by-Side Dual-Pane Study View (PDF on Left, Quiz on Right) */}
{selectedNote && showQuizSession ? (
  <div className={`rounded-3xl overflow-hidden border shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-500 relative ${
    isDark ? 'border-purple-500/30 bg-slate-900/95' : 'border-purple-200 bg-white'
  }`}>
    {/* Dual-Pane Header */}
    <div className={`p-4 border-b flex items-center justify-between ${
      isDark ? 'border-slate-800 bg-slate-950/60' : 'border-gray-100 bg-gray-50'
    }`}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowQuizSession(false)}
          className={`p-2 rounded-xl transition-all active:scale-95 text-xs font-bold flex items-center gap-1.5 ${
            isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <ArrowLeft size={14} />
          <span>Exit Quiz</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600/20 to-indigo-600/20 text-purple-400 border border-purple-500/30">
            Study Mode
          </span>
          <h3 className={`text-sm font-bold truncate max-w-xs sm:max-w-md ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {selectedNote.title}
          </h3>
        </div>
      </div>
    </div>

    {/* Responsive Dual-Pane Container */}
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[780px] h-[82vh] divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
      {/* Left Pane: Visual PDF Document Viewer (58% width on desktop) */}
      <div className="lg:col-span-7 h-full flex flex-col p-4 overflow-hidden">
        <NoteViewer
          note={selectedNote}
          isDark={isDark}
          isLoading={isFetchingNote}
          hideTopHeader={true}
        />
      </div>

      {/* Right Pane: AI Interactive Quiz (42% width on desktop) */}
      <div className="lg:col-span-5 h-full flex flex-col overflow-hidden bg-slate-950/40">
        <QuizSession
          note={selectedNote}
          apiKey={geminiApiKey}
          isDark={isDark}
          onClose={() => setShowQuizSession(false)}
          triggerMascot={triggerMascot}
        />
      </div>
    </div>
  </div>
) : selectedNote ? (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
    <NoteViewer 
      note={selectedNote} 
      isDark={isDark} 
      isLoading={isFetchingNote}
      onClose={() => setSelectedNote(null)}
      onStartQuiz={() => setShowQuizSession(true)}
      onWikilinkClick={async (target) => {
        try {
          setIsFetchingNote(true);
          const res = await fetch(`/api/obsidian/search?q=${encodeURIComponent(target)}`);
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            handleSelectNote(data.results[0].note || data.results[0]);
          } else {
            alert(`Could not find note: ${target}`);
            setIsFetchingNote(false);
          }
        } catch (e) {
          setIsFetchingNote(false);
        }
      }}
      onUpdateNote={async (updatedContent) => {
        const updated = { ...selectedNote, bodyContent: updatedContent, rawContent: updatedContent };
        setSelectedNote(updated);
        
        try {
          await fetch('/api/obsidian/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: session?.user?.id,
              notes: [{
                title: selectedNote.title,
                path: (selectedNote as any).path || (selectedNote as any).relativePath || selectedNote.id,
                content: updatedContent,
                folder: selectedNote.folder,
                tags: selectedNote.tags,
                word_count: updatedContent.split(/\s+/).filter(Boolean).length
              }]
            })
          });
        } catch (e) {
          console.error('Failed to save note update', e);
        }
      }}
    />
  </div>
) : ...
```

#### 6.2 `src/app/vault/page.tsx`:
Create `d:\AI\جبنة\vibe-todos\src\app\vault\page.tsx` forwarding to the main study workspace:

```tsx
'use client';

import React from 'react';
import MainPage from '@/app/page';

export default function VaultPage() {
  return <MainPage />;
}
```

---

## 3. Step-by-Step Worker Execution Sequence

The Worker agent should execute tasks in the following exact sequence:

1. **Step 1: Write & Execute Storage Infrastructure Script**
   - Create `scripts/setup-storage.js`.
   - Run `node scripts/setup-storage.js`.
   - Confirm output displays `media` bucket verified and 4 RLS policies configured.

2. **Step 2: Write & Execute Storage Verification Acceptance Test**
   - Create `scripts/verify-storage.js`.
   - Run `node scripts/verify-storage.js`.
   - Confirm exit code 0 and successful upload/GET check.

3. **Step 3: Write & Execute Base64 Database Migration Script**
   - Create `scripts/migrate-base64-notes.js`.
   - Run `node scripts/migrate-base64-notes.js`.
   - Confirm legacy `Documents/1.pdf.md` (and any other base64 notes) are migrated to Supabase Storage URLs.

4. **Step 4: Update Frontend Upload Pipeline**
   - Update `src/components/study/NoteExplorer.tsx`.
   - Create `src/components/vault/NoteExplorer.tsx` (re-export).

5. **Step 5: Overhaul Note & PDF Viewer Component**
   - Update `src/components/study/NoteViewer.tsx`.
   - Create `src/components/vault/NoteViewer.tsx` (re-export).

6. **Step 6: Upgrade Dual-Pane Study Layout**
   - Update `src/app/page.tsx`.
   - Create `src/app/vault/page.tsx`.

7. **Step 7: Execute Full Verification Suite**
   - Run `node scripts/verify-storage.js`.
   - Run `npm run test` or `npm run build`.
   - Confirm zero type or runtime errors.

---

## 4. Verification & Validation Matrix

| Target Requirement | Verification Method | Expected Result |
| :--- | :--- | :--- |
| **R1. Storage Upload Pipeline** | Run `node scripts/verify-storage.js` & upload test PDF via `NoteExplorer.tsx` | Binary stored in Supabase `media`, public URL in YAML frontmatter, DB payload < 50KB. |
| **R2. Storage Infra Automation** | Run `node scripts/setup-storage.js` | Bucket `media` created/updated with `public: true`, RLS enabled on `storage.objects`. |
| **R3. Visual PDF Viewer & Dual Pane** | Load PDF note and start AI Quiz | Left pane renders responsive visual PDF document; right pane runs AI Quiz referencing clean `note.bodyContent`. |
| **Database Cleansing** | Run `node scripts/migrate-base64-notes.js` | Zero rows in `vault_notes` contain `data:application/pdf;base64`. Size reduced by >99%. |
| **Build & Compilation** | Run `npm run build` | Zero TypeScript, ESLint, or Next.js build errors. |
