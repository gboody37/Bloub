# Survey Analysis: PDF Reading/Viewing UI, Document Rendering & AI Quiz Integration

**Explorer**: Explorer 3 (Survey Phase)  
**Project Root**: `d:\AI\جبنة\vibe-todos`  
**Timestamp**: 2026-08-24T13:30:00Z  

---

## Executive Summary

The Vibe Todos application contains a rich Study Workspace for note reading, markdown parsing, and interactive AI quiz generation powered by Google Gemini (`gemini-2.0-flash`) or a local mock engine. However, the current PDF viewing and storage pipeline has a critical bottleneck: when a PDF is uploaded, it extracts text in-browser and encodes the entire PDF as a massive **base64 data URL** embedded directly in the YAML frontmatter (`--- \n pdf_url: data:application/pdf;base64,... \n ---`), saving megabytes of binary text into the `vault_notes.content` column in PostgreSQL.

This causes extreme lag, Supabase statement timeouts, and rendering slowness. Furthermore, when taking an AI Quiz, the UI currently unmounts the document viewer entirely, preventing users from viewing the source PDF while answering questions.

Migrating PDF storage to the existing Supabase `media` bucket with public URLs, using a native high-performance responsive `<iframe>` / `<object>` visual document viewer, and introducing a **Side-by-Side Dual-Pane Study Layout** (PDF on the left, Quiz on the right) will eliminate database bloat, provide a NotebookLM-grade study experience, and maintain 100% compatibility with React 19.

---

## 1. Investigation of Current Note Reading & PDF Viewing UI

### 1.1 Component Map & UI Call Chain

| Component / File | Purpose & Current Behavior | Line References |
|---|---|---|
| `src/app/page.tsx` | Main workspace coordinator. Manages `selectedNote`, `showQuizSession`, `showStudyExplorer`. Switches between list types (`study` vs `todo`). | Lines 118–125, 1709–1768 |
| `src/components/study/NoteExplorer.tsx` | Vault explorer & upload trigger. Contains the "PDF" upload handler `handleDocumentUpload`. | Lines 80–156 |
| `src/components/study/NoteViewer.tsx` | Note reading UI. Renders markdown content or an embedded `iframe` if `note.frontmatter?.pdf_url` exists. | Lines 681–697 |
| `src/components/study/QuizSession.tsx` | Interactive AI Quiz interface. Renders question cards, multiple choice options, hints, and score calculations. | Lines 1–340 |
| `src/lib/obsidian/parser.ts` | Pure parser `parseObsidianMarkdown`. Separates YAML frontmatter (`pdf_url`) from `bodyContent`. | Lines 39–202 |
| `src/lib/obsidian/scanner.ts` | Database query interface `getNoteByPath` and `scanVaultDirectory` from `vault_notes`. | Lines 59–228 |
| `src/app/api/extract/pdf/route.ts` | Server-side PDF text extraction route using `pdf-parse`. | Lines 1–20 |
| `src/app/api/study/quiz/route.ts` | AI Quiz generation, hint, and answer evaluation API route. | Lines 1–185 |

### 1.2 Root Cause of Database Timeouts & Viewing Lag

In `src/components/study/NoteExplorer.tsx` (lines 82–156), the PDF upload handler currently executes:
```typescript
// 1. Reads file as arrayBuffer
const arrayBuffer = await file.arrayBuffer();

// 2. Converts binary to base64 Data URL in browser memory
const bytes = new Uint8Array(arrayBuffer);
let binary = '';
for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
pdfDataUrl = `data:application/pdf;base64,${btoa(binary)}`;

// 3. Extracts text via pdfjsLib (first 50 pages)
let text = pdfDataUrl ? `---\npdf_url: ${pdfDataUrl}\n---\n\n` : '';
for (let i = 1; i <= maxPages; i++) { ... text += pageText; }

// 4. Stores the entire multi-megabyte string into PostgreSQL vault_notes table
const newNote = {
  user_id: user.id,
  title: title,
  content: text, // <-- Contaminated with 10MB - 50MB of base64 text!
  path: `Documents/${file.name}.md`,
  folder: 'Documents',
  tags: ['document', 'pdf'],
  word_count: text.split(/\s+/).length,
  updated_at: new Date().toISOString()
};
await supabase.from('vault_notes').upsert([newNote]);
```

#### Why This Breaks:
1. **PostgreSQL Statement Timeouts**: Saving or fetching rows with 10MB–50MB base64 text blocks in `vault_notes.content` exceeds standard REST/RPC buffer limits and hits 504 gateway timeouts.
2. **Network & Memory Inefficiency**: Browsing notes downloads huge payloads over mobile connections.
3. **Browser Iframe Lag**: Passing a 20MB `data:application/pdf;base64,...` URL to an `iframe` or `object` forces the browser engine to decode and allocate huge RAM chunks, often crashing iOS Safari or mobile Chrome tabs.

### 1.3 How Markdown vs PDF is Currently Rendered

In `src/components/study/NoteViewer.tsx` (lines 681–697):
```tsx
{isEditing ? (
  <textarea ... />
) : note.frontmatter?.pdf_url ? (
  <div className="flex flex-col w-full h-full space-y-4 p-2">
    <iframe
      src={note.frontmatter.pdf_url}
      className={`w-full h-[75vh] rounded-2xl shadow-md border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
      title="PDF Viewer"
    />
    <details className={`p-4 rounded-xl border transition-all ${isDark ? 'bg-slate-900/30 border-slate-800 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider select-none outline-none">Show Extracted Text (For AI Quizzes)</summary>
      <div className="mt-4 opacity-80 text-sm">
        {renderMarkdownContent(editContent)}
      </div>
    </details>
  </div>
) : (
  renderMarkdownContent(editContent)
)}
```

When `pdf_url` is a valid public URL instead of a base64 string, `NoteViewer` is already structurally ready to embed the visual document.

---

## 2. PDF Document Rendering Technology Evaluation

We evaluated 4 options for rendering the visual PDF document in Vibe Todos:

| Criteria | Option A: Native `<iframe>` / `<object>` with Supabase Public URL | Option B: `react-pdf` (`@react-pdf/renderer` or `react-pdf`) | Option C: Custom PDF.js Canvas Viewer | Option D: Google Docs / Cloud Viewer Embed |
|---|---|---|---|---|
| **Bundle Size Overhead** | **0 KB** (Native browser component) | ~400 KB + WebWorker files | ~350 KB | 0 KB (External service) |
| **React 19 Compatibility** | **100% Native** | High risk (React 19 peer dep issues) | Compatible with wrapper | Compatible |
| **Rendering Performance** | **Hardware-accelerated**, streaming byte-range support | Canvas rendering per page, high RAM | Canvas per page, heavy on mobile | Relies on Google proxy |
| **Scrolling & Zooming** | Native pinch-to-zoom, page jump, continuous scroll | Manual virtualized scroll | Manual virtualized scroll | Google viewer iframe |
| **Controls & Search** | Full native toolbar (Ctrl+F, thumbnails, print, download) | Must build custom UI controls | Must build custom UI controls | Google toolbar |
| **Mobile Responsiveness** | Supported (with fallback "Open in Tab") | Slow on low-end mobile | Slow on low-end mobile | Requires internet proxy |
| **Security & Privacy** | Direct from user's Supabase Storage CDN | Client-side memory | Client-side memory | Sends URL to 3rd-party Google |

### Recommendation: Option A — Native `<iframe>` / `<object>` with Supabase Public URL & Enhanced Container Controls

#### Implementation Specifications:
1. **Public URL Structure**:
   `https://<project-ref>.supabase.co/storage/v1/object/public/media/vault_pdfs/<file_uuid>.<ext>`
2. **Viewer Container Enhancements**:
   - Add a top utility bar inside the viewer header:
     - `ExternalLink` ("Open in Full Window / New Tab")
     - `Maximize2` / `Minimize2` (Expand viewer to full viewport)
     - `Download` (Direct download link)
     - `Copy` (Copy document link)
   - Iframe parameters:
     ```tsx
     <iframe
       src={`${pdfUrl}#toolbar=1&navpanes=1&view=FitH`}
       className="w-full h-full rounded-2xl border border-slate-700/60 bg-slate-900 shadow-inner"
       title={note.title}
       loading="lazy"
     />
     ```
   - Fallback message for older mobile browsers that do not render inline PDFs:
     ```tsx
     <object data={pdfUrl} type="application/pdf" className="w-full h-full">
       <div className="flex flex-col items-center justify-center p-8 text-center">
         <p className="text-sm text-slate-400 mb-3">Your browser does not support inline PDF viewing.</p>
         <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs">Open PDF in New Tab</a>
       </div>
     </object>
     ```

---

## 3. AI Quiz Ingestion & Content Access Analysis

### 3.1 Current AI Quiz Pipeline
1. `QuizSession.tsx` receives `note: ParsedObsidianNote`.
2. Calls `/api/study/quiz` passing `noteTitle: note.title` and `noteContent: note.bodyContent`.
3. `/api/study/quiz/route.ts` forwards `noteContent` to `QuizService.generateQuiz()` -> `GeminiClient.generateQuiz()`.
4. `GeminiClient` embeds `noteContent` in the user prompt to Gemini `gemini-2.0-flash`:
   ```
   Note Title: ${noteTitle}
   Note Content:
   ${noteContent}
   ```

### 3.2 Impact of the Storage Migration on AI Quiz
Under the upgraded architecture:
1. When uploading a PDF, text is extracted via `pdfjsLib` (client) or `/api/extract/pdf` (server) into clean plain text.
2. The file is uploaded to `supabase.storage.from('media').upload(...)`, producing a clean public URL.
3. The note saved in `vault_notes` will be:
   ```markdown
   ---
   pdf_url: https://xyz.supabase.co/storage/v1/object/public/media/vault_pdfs/178757_sample.pdf
   file_name: sample.pdf
   source: pdf
   ---

   # Sample Document Title

   1. Introduction
   In this chapter we explore ...
   ```
4. When `parseObsidianMarkdown` runs:
   - `frontmatter.pdf_url` = `https://xyz.supabase.co/...` (small string)
   - `bodyContent` = Clean extracted text (e.g. 2,000 to 15,000 words).
   - `wordCount` = accurate text word count.
5. When `QuizSession` invokes the quiz API:
   - It sends `note.bodyContent` (the extracted text).
   - Zero base64 pollution reaches the LLM.
   - Saves prompt tokens and guarantees Gemini receives 100% semantic content.
   - Socratic Hints (`generateHint`) and Answer Grading (`evaluateAnswer`) will reference `note.bodyContent` accurately.

---

## 4. UI/UX Layout: Coexistence of Visual PDF Viewer & AI Quiz

### 4.1 Current UX Limitation
In `src/app/page.tsx` (lines 1709–1726):
```tsx
{selectedNote && showQuizSession ? (
  <QuizSession ... />
) : selectedNote ? (
  <NoteViewer ... />
) : ...}
```
`QuizSession` is an **exclusive replacement**. When the user starts a quiz, the document vanishes. The student cannot reference diagrams, tables, formulas, or specific paragraphs while answering questions.

### 4.2 Proposed Dual-Pane & Responsive Layout Architecture

#### A. Desktop & Tablet Landscape View (`lg:` ≥ 1024px) — Side-by-Side Dual-Pane Study Mode
```
+-----------------------------------------------------------------------------------------+
| [← Back to Hub]    📘 Book Title: Quantum Mechanics (PDF)        [Exit Quiz] [Bloub 🤖] |
+----------------------------------------------------+------------------------------------+
|  LEFT PANE: VISUAL PDF VIEWER (55% Width)          |  RIGHT PANE: AI STUDY QUIZ (45%)   |
|                                                    |                                    |
|  +----------------------------------------------+  |  +------------------------------+  |
|  | [🔍 Zoom] [🗖 Fullscreen] [🔗 Open New Tab]  |  |  | Question 2 of 5  [● ● ○ ○ ○]  |  |
|  +----------------------------------------------+  |  +------------------------------+  |
|  |                                              |  |  Multiple Choice (Medium)       |  |
|  |   [ Live Embedded PDF Document Viewer ]      |  |  What is the core principle?    |  |
|  |   - Full native scroll & pagination          |  |                                 |  |
|  |   - Page 12 of 148                           |  |  [ A. Option One              ] |  |
|  |   - Interactive text selection & search      |  |  [ B. Option Two (Selected)   ] |  |
|  |                                              |  |  [ C. Option Three            ] |  |
|  |                                              |  |  [ D. Option Four             ] |  |
|  |                                              |  |                                 |  |
|  |                                              |  |  [💡 Ask Bloub for Hint]        |  |
|  |                                              |  |  [ Next Question → ]            |  |
|  +----------------------------------------------+  |  +------------------------------+  |
+----------------------------------------------------+------------------------------------+
```

#### B. Mobile & Narrow View (`< 1024px`) — Segmented Tabs with Floating Quick-Toggle
- Top Segmented Bar: `[ 📄 PDF Document ]` | `[ ✨ AI Quiz (2/5) 🟢 ]` | `[ 📝 Extracted Text ]`
- User can toggle between the document and quiz with one tap without reloading either iframe or quiz state.
- Floating badge at bottom right: `[✨ Quiz: Q2/5]` to quickly return to questions while reading.

#### C. Extracted Text Accordion / Reader Tab
- Beneath the PDF viewer or via tab, provide a toggle for "Extracted Text (Reader View)".
- Allows users on slow connections or small mobile screens to read clean formatted markdown if they prefer reader mode over visual PDF pages.

---

## 5. Summary of Architecture Recommendations for Implementer

1. **Storage Bucket**: Ensure `media` storage bucket exists with public access policy (via migration/setup script).
2. **Upload Handler**: Update `NoteExplorer.tsx` `handleDocumentUpload` to:
   - Upload PDF binary to `supabase.storage.from('media').upload(...)`.
   - Retrieve public URL via `supabase.storage.from('media').getPublicUrl(...)`.
   - Extract text using `pdfjsLib` / `pdf-parse`.
   - Save clean markdown note with public URL in frontmatter.
3. **NoteViewer Upgrades**:
   - Enhance the `note.frontmatter?.pdf_url` rendering block with responsive toolbar (fullscreen, external link, download).
4. **Main Page Layout (`page.tsx`)**:
   - When `selectedNote` and `showQuizSession` are active, render the Side-by-Side Dual Pane layout on `lg` screens, and tabbed view on mobile.
