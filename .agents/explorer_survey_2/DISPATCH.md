## 2026-08-24T13:27:49Z

Investigate the PDF upload pipeline, data flow, and storage mechanism in Vibe Todos.
Specifically determine:
1. Where and how PDF files are currently uploaded, processed, and converted (where base64 conversion happens).
2. Where in the codebase `vault_notes` is read and written (components, hooks, API routes, services).
3. Where the payload size/base64 causes lag, UI freezes, or Supabase statement timeouts.
4. Exactly what changes are needed to switch the upload pipeline from base64 embedding to uploading directly to Supabase Storage bucket `media` and storing the public URL (or file path + metadata) in `vault_notes`.
5. How backward compatibility with existing notes (or migration of existing base64 notes) should be handled.
