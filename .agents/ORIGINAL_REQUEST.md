# Original User Request

## 2026-08-24T13:26:52Z

# Teamwork Project Prompt — Draft

> Requested team: Full team

Fix the PDF upload and reading architecture in the Vibe Todos app to prevent extreme lag and Supabase statement timeouts caused by storing massive base64 PDFs directly in the database, and upgrade the viewing experience.

Working directory: d:\AI\جبنة\vibe-todos
Integrity mode: demo

## Requirements

### R1. Supabase Storage Migration
The application must upload PDF files to a Supabase Storage bucket named `media` and store only the public URL in the `vault_notes` database, rather than embedding the entire file as a base64 string. 

### R2. Automated Infrastructure Setup
The team must provide and execute a script (e.g., Node.js or SQL migration) that automatically creates the `media` storage bucket in the user's Supabase project and configures the necessary public access and RLS policies, ensuring it works out-of-the-box.

### R3. PDF Viewer UI Overhaul
The application's note reading interface must be upgraded to render the actual PDF document (allowing reading, scrolling, and interaction) rather than just dumping the extracted raw text, while still maintaining the AI quiz functionality alongside it.

## Acceptance Criteria

### Verification
- [ ] An automated test script (`scripts/verify-storage.js`) successfully uploads a mock file to the Supabase `media` bucket and retrieves a valid public URL without "Bucket not found" errors.
- [ ] An agent evaluator confirms that opening a PDF note in the UI renders the visual document (e.g. via an iframe or embedded viewer) and not just raw text.
