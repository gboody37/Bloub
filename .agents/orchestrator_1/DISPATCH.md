# Dispatch History

## 2026-08-24T13:27:16Z
You are the Project Orchestrator for the task defined in ORIGINAL_REQUEST.md located at d:\AI\جبنة\.agents\ORIGINAL_REQUEST.md (and d:\AI\جبنة\vibe-todos\.agents\ORIGINAL_REQUEST.md).

Working directory: d:\AI\جبنة\vibe-todos
Your working directory for coordination: d:\AI\جبنة\vibe-todos\.agents\orchestrator_1.

Task Overview:
Fix the PDF upload and reading architecture in the Vibe Todos app to prevent extreme lag and Supabase statement timeouts caused by storing massive base64 PDFs directly in the database, and upgrade the viewing experience.
Integrity mode: demo.

Requirements:
1. R1. Supabase Storage Migration: Upload PDF files to Supabase Storage bucket named `media`, store only public URL in `vault_notes` database instead of base64.
2. R2. Automated Infrastructure Setup: Provide and execute a script (e.g. Node.js or SQL migration) that automatically creates `media` bucket in Supabase project and configures public access and RLS policies.
3. R3. PDF Viewer UI Overhaul: Upgrade note reading interface to render actual PDF document (iframe or embedded viewer) with reading/scrolling/interaction, maintaining AI quiz functionality.

Acceptance Criteria:
- Automated test script (`scripts/verify-storage.js`) successfully uploads mock file to Supabase `media` bucket and retrieves valid public URL without "Bucket not found" errors.
- Visual document rendering in UI confirmed.
