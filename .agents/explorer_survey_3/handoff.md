# Handoff Report — Explorer 3: PDF Viewing UI, Rendering Technologies & AI Quiz Integration

**Agent**: Explorer 3 (Survey Phase)  
**Parent**: Orchestrator (`8a594263-53b2-4092-a6f4-e662cdd61716`)  
**Type**: Hard Handoff (Task Complete)  
**Report Date**: 2026-08-24T13:31:00Z  

---

## 1. Observation

1. **Current PDF Upload Mechanism**:
   - In `src/components/study/NoteExplorer.tsx` lines 90–98:
     When uploading a PDF, it converts the binary buffer into a base64 Data URL in browser memory:
     `pdfDataUrl = data:application/pdf;base64,${btoa(binary)}`
   - In lines 115, 138, 146:
     It prepends this base64 string to the note markdown:
     `let text = pdfDataUrl ? '---\npdf_url: ' + pdfDataUrl + '\n---\n\n' : '';`
     and upserts the entire multi-megabyte string into the PostgreSQL `vault_notes` table (`content` column).
2. **Current Note & PDF Reading UI**:
   - In `src/components/study/NoteViewer.tsx` lines 681–695:
     If `note.frontmatter?.pdf_url` is present, it renders an `<iframe>` with `src={note.frontmatter.pdf_url}` plus a collapsible `<details>` element containing the extracted text.
   - If `note.frontmatter?.pdf_url` is absent, it renders markdown via `renderMarkdownContent(editContent)`.
3. **AI Quiz Pipeline**:
   - In `src/components/study/QuizSession.tsx` lines 40–50:
     Sends `noteTitle: note.title` and `noteContent: note.bodyContent` to `/api/study/quiz`.
   - In `src/app/api/study/quiz/route.ts` lines 127–154 and `src/lib/ai/gemini.ts` lines 205–265:
     `GeminiClient.generateQuiz` sends `noteContent` (which is `note.bodyContent`) directly to Gemini `gemini-2.0-flash` to generate questions, explanations, citations, and hints.
4. **Current UI Layout Limitation**:
   - In `src/app/page.tsx` lines 1709–1726:
     `{selectedNote && showQuizSession ? <QuizSession ... /> : selectedNote ? <NoteViewer ... /> : ...}`
     When `showQuizSession` is active, `NoteViewer` is completely unmounted. The user cannot see or reference the PDF document while taking the AI Quiz.
5. **Existing Supabase Storage Usage**:
   - In `src/app/page.tsx` lines 529–533 and `src/components/study/NoteViewer.tsx` lines 89–93:
     The codebase already uses `supabase.storage.from('media').upload(...)` and `supabase.storage.from('media').getPublicUrl(...)` for attachments and images.

---

## 2. Logic Chain

1. **Root Cause Analysis**:
   - Base64 encoding inflates binary file size by ~33%. A 10MB PDF becomes ~13.3MB of text.
   - Storing 13MB+ text in a PostgreSQL text column (`vault_notes.content`) causes high I/O overhead, payload transfer bloat over Supabase REST APIs, and database statement timeouts (504/timeout errors).
   - In the browser, embedding a 15MB base64 data URI in an iframe forces excessive RAM allocation and decoder crashes on mobile browsers.
2. **Document Viewer Selection**:
   - `react-pdf` has peer dependency incompatibilities with React 19 (`react@19.2.8`) and adds ~400KB bundle bloat with heavy canvas worker threads.
   - Native `<iframe>` / `<object>` pointing to a Supabase public URL (`https://.../storage/v1/object/public/media/vault_pdfs/...`) provides 0KB bundle overhead, native hardware-accelerated PDF streaming, zoom/search/print controls, and 100% React 19 compatibility.
3. **AI Quiz Decoupling**:
   - When the PDF is stored in Supabase Storage and only its public URL is placed in `frontmatter.pdf_url`, `note.bodyContent` contains only the clean extracted text.
   - `QuizSession` receives `note.bodyContent` directly. Gemini receives pure textual content without base64 noise, saving tokens and improving question accuracy.
4. **Coexistence UX Architecture**:
   - Because study workflows require referencing source diagrams/text during quizzing, replacing `NoteViewer` with `QuizSession` is suboptimal.
   - A **Side-by-Side Dual-Pane Layout** (55% PDF viewer on left, 45% AI Quiz panel on right) on `lg:` viewports, combined with a **Segmented Tab Bar** on mobile viewports, provides optimal ergonomics and NotebookLM-level usability.

---

## 3. Caveats

1. **Storage Bucket Dependency**:
   - The Supabase Storage bucket `media` must exist with public read access and appropriate RLS policies. If the bucket does not exist, upload fails. (Covered by requirement R2).
2. **Older Mobile Safari PDF Rendering**:
   - Some mobile iOS browsers display only the first page in native iframes. Providing an explicit "Open PDF in New Tab" / "Download" button in the viewer toolbar ensures universal fallback.
3. **Large Document Token Limits**:
   - Extracting text from massive books (> 100 pages) may exceed Gemini single-turn prompt limits (though `gemini-2.0-flash` supports 1M tokens). Retaining page-limited or section-based extraction keeps quiz generation snappy.

---

## 4. Conclusion

1. **Document Viewer**: Use a native responsive `<iframe>` / `<object>` container targeting the Supabase Storage Public URL, augmented with a top control bar (Fullscreen, Open in Tab, Download, Reader View toggle).
2. **Storage Separation**: PDF files belong in Supabase Storage `media` bucket under `vault_pdfs/`; `vault_notes` must only store the public URL in YAML frontmatter alongside clean extracted markdown text in the body.
3. **AI Quiz Integration**: The AI Quiz service already consumes `note.bodyContent`. Storing public URLs in frontmatter perfectly separates visual rendering (`frontmatter.pdf_url`) from AI prompt text (`bodyContent`).
4. **UI Layout**: Replace the exclusive modal view in `page.tsx` with a **Side-by-Side Dual-Pane Study Layout** (`lg:` viewports) and a **Tabbed / Quick-Toggle Interface** (mobile viewports), allowing simultaneous document reading and quiz answering.

---

## 5. Verification Method

To independently verify these findings and existing system health:
1. **Verification Test Suite**:
   ```bash
   cmd /c npm test
   ```
   Verifies AC-1 (list type isolation), AC-2 (Obsidian note parsing and YAML frontmatter extraction), and AC-3 (Gemini AI Quiz generation & scoring).
2. **Code Inspection**:
   - Inspect `src/components/study/NoteExplorer.tsx` (lines 90–156) for current base64 encoding.
   - Inspect `src/components/study/NoteViewer.tsx` (lines 681–695) for current iframe rendering.
   - Inspect `src/app/page.tsx` (lines 1709–1726) for exclusive view switching.
   - Inspect `src/lib/ai/gemini.ts` (lines 205–265) for `noteContent` prompt injection.
3. **Detailed Survey Artifact**:
   Read `d:\AI\جبنة\vibe-todos\.agents\explorer_survey_3\analysis.md` for complete technical details, code samples, and architecture diagrams.
