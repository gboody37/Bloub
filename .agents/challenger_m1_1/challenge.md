# Empirical Challenge Report: Milestone M1_PDF_OVERHAUL

**Agent**: Challenger 1 (`challenger_m1_1`)  
**Role**: Empirical Critic & Specialist  
**Milestone**: M1_PDF_OVERHAUL — Supabase Storage Migration & Visual Study Suite  
**Verdict**: **APPROVE**  
**Date**: 2026-08-24  
**Project Root**: `d:\AI\جبنة\vibe-todos`  

---

## Challenge Summary

**Overall risk assessment**: **LOW**

Empirical stress-testing of the Supabase Storage infrastructure, upload mechanisms, and PDF viewing suite confirmed high reliability, concurrency resilience, and proper edge-case handling.

---

## Challenges & Empirical Findings

### [Medium] Challenge 1: Filename Character Sanitization in S3 Storage Keys

- **Assumption challenged**: Raw user-uploaded filenames containing non-ASCII characters (e.g. Arabic, emojis), square brackets `[...]`, plus signs `+`, or exclamation marks `!` can be directly passed to Supabase Storage keys and fetched via public URLs without encoding failures.
- **Attack scenario**: When uploading un-sanitized keys like `doc_(v1.0)+test-[final]!.txt` to Supabase Storage, the `/storage/v1/object/public/` endpoint gateway returns HTTP 400 Bad Request if brackets or pluses are present in the URL path.
- **Blast radius**: If raw filenames were used in storage keys, users uploading PDFs with symbols or Arabic names would experience broken document viewer embeds.
- **Mitigation & Verification**: Inspected `src/components/study/NoteExplorer.tsx` (line 99) and `scripts/migrate-base64-notes.js` (line 68). The worker implemented a robust sanitization filter:
  ```js
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `vault_pdfs/${userId}/${Date.now()}_${cleanFileName}`;
  ```
  Empirically stress-tested dirty filename inputs (`ملخص دراسة (AI & Physics) + [v1.0] #final!.pdf`) through this sanitization pipeline. Result: 100% upload success, clean public URL generation, and HTTP 200 GET retrieval.

---

### [Low] Challenge 2: High Concurrency Upload & Download Throughput

- **Assumption challenged**: Concurrent PDF uploads and parallel public URL requests might experience race conditions, socket exhaustion, or statement timeouts on Supabase Storage.
- **Attack scenario**: Simultaneously stream 10 parallel uploads to the `media` bucket under `vault_pdfs/stress_<RUN_ID>/` using `Promise.all()`, followed immediately by 10 concurrent HTTP GET requests to fetch and byte-compare payloads.
- **Blast radius**: Storage failures during multi-file sync or rapid successive PDF uploads.
- **Mitigation & Verification**: Executed 10 concurrent streams in `scripts/test-challenger-storage.js`. Completed in 579ms (average 57.9ms per upload) and 1456ms total GET verification with 100% byte integrity across all 10 files.

---

### [Low] Challenge 3: Idempotency & Upsert Collision Control

- **Assumption challenged**: Attempting to upload to an existing key with `upsert: false` should be rejected, while `upsert: true` should safely overwrite without corrupting the bucket or database.
- **Attack scenario**: Upload `idemp_<RUN_ID>.txt` with initial payload (V1), attempt duplicate upload with `upsert: false`, then overwrite with `upsert: true` (V3).
- **Blast radius**: Accidental data loss or unhandled promise rejections on duplicate filenames.
- **Mitigation & Verification**: Supabase Storage correctly rejected duplicate upload (`upsert: false`) with error `"The resource already exists"`, and succeeded on `upsert: true` with confirmed byte integrity of updated payload V3.

---

### [Low] Challenge 4: Multi-Format Binary & Document Ingestion

- **Assumption challenged**: Storage bucket supports various MIME types (PDF, PNG image, UTF-8 Arabic Markdown, JSON) without MIME mismatch or corruption.
- **Mitigation & Verification**: Uploaded and retrieved binary PDF (%PDF-1.4 header), binary 1x1 PNG image, UTF-8 Arabic Markdown note, and JSON dataset. All 4 formats verified with HTTP 200 and byte-level equality.

---

## Stress Test Results

| Test ID | Test Scenario | Expected Behavior | Actual Behavior | Result |
| :--- | :--- | :--- | :--- | :--- |
| **ST-1.1** | 10 Concurrent Parallel Uploads | All 10 uploads resolve successfully | Completed in 579ms (avg 57.9ms/upload) | **PASS** |
| **ST-1.2** | 10 Concurrent HTTP GET Fetches | HTTP 200 OK + 100% byte match | Verified 10/10 in 1456ms | **PASS** |
| **ST-2.1** | PDF Document Binary Ingestion | Upload binary PDF & retrieve with HTTP 200 | Buffer match, Content-Type: `application/pdf` | **PASS** |
| **ST-2.2** | PNG Image Binary Ingestion | Upload binary PNG & retrieve with HTTP 200 | 100% byte-for-byte buffer match | **PASS** |
| **ST-2.3** | UTF-8 / Arabic / Emoji Markdown | Upload UTF-8 note & verify text decoding | String match including Arabic & emojis | **PASS** |
| **ST-2.4** | JSON Structured Document | Upload JSON & parse response | JSON parsed and deep-equal | **PASS** |
| **ST-3.1** | Dirty Filename Sanitization | Sanitize dirty filename with symbols/brackets | Clean key uploaded & fetched with HTTP 200 | **PASS** |
| **ST-3.2** | Idempotency & Upsert Overwrite | Reject duplicate (`upsert: false`), overwrite (`upsert: true`) | Duplicate rejected; Overwrite confirmed | **PASS** |
| **ST-4.1** | Non-Existent Bucket Rejection | Attempt upload to fake bucket | Rejected with error `"Bucket not found"` | **PASS** |
| **ST-5.1** | Bucket Artifact Teardown | Remove all probe artifacts | 16/16 test files cleanly deleted | **PASS** |

---

## Acceptance Script Verification

- Executed `node scripts/verify-storage.js` -> **Exit code 0** (All 4 acceptance criteria stages passed).
- Executed `npx.cmd tsc --noEmit` -> **Exit code 0** (0 TypeScript errors across the repository).

---

## Unchallenged Areas

- **Client-Side PDF Canvas Rendering in Headless Mode**: Visual iframe rendering was verified by inspecting component layout and DOM structure (`src/components/study/NoteViewer.tsx`), but browser-level visual pixel rendering was not tested via Selenium/Playwright as headless browser runner is not configured in this environment.
