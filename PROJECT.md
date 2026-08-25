# Project: Arabic RTL PDF Engine Overhaul & Annotation Tool Preservation

## Architecture
- **Host App**: Next.js 16 / React 19 / Turbopack in ibe-todos
- **Host Page & Layout**: src/app/page.tsx renders NoteViewer.tsx in full-screen (h-[100dvh]) or dual-pane study mode.
- **Portal Anchor**: NoteViewer.tsx mounts #pdf-tools-portal for toolbar projection.
- **Rendering & Text Layer Engine**:
  - src/lib/pdf/arabic-bidi.ts: Unicode Presentation Forms normalization (\uFE70-\uFEFF, \uFB50-\uFDFF -> \u0600-\u06FF), BiDi classification, visual-to-logical reversal, line clustering, and bounding box computation.
  - src/components/study/ArabicTextLayer.tsx: High-precision DOM text layer with direction: rtl, unicode-bidi: isolate, and pixel-perfect coordinate mapping matching canvas glyphs.
  - src/components/study/PdfNotebookViewer.tsx: PDF viewport manager integrating PDF document rendering, custom Arabic text layer, and interactive annotation overlays.
- **Annotation Overlay & Tools**:
  - PdfNotebookViewer.tsx manages scale-invariant unscaled coordinates (startX, startY, w, h) for highlights and (x, y, text, color, fontSize) for text notes.
  - Floating DOM overlay (overlayRef) rendered directly over canvas with pointer event capture.
  - All 9 toolbar controls: Pan, Cursor, Highlight (Box & Text selection), Text Note, Eraser, Undo, Zoom (50%-300%), Page Nav, Sidebar toggle.
- **Persistence Pipeline**:
  - YAML frontmatter serialization under key pdf_notes in src/lib/obsidian/parser.ts to Supabase public.vault_notes.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| F1 | Unicode Presentation-Form Normalizer | Maps Presentation Forms-A/B (\uFB50..\uFEFF) to Canonical Arabic (\u0600..\u06FF) | M1 | Survey / R1 | DONE |
| F2 | Visual-to-Logical BiDi Reordering | Detects visual-order PDF streams and reorders Arabic glyphs to logical sequence | M1 | Survey / R1 | DONE |
| F3 | Diacritic & Ligature Normalization | Preserves/normalizes Tashkeel (\u064B..\u0652) and Lam-Alef ligatures | M1 | Survey / R1 | DONE |
| F4 | Text Item Line Clustering | Aggregates text items sharing vertical baseline into coherent line spans with bounding boxes | M1 | Survey / R1 | DONE |
| F5 | Mixed LTR/RTL Bidirectional Isolation | Isolates embedded numbers (Western/Eastern) and English phrases within Arabic lines | M1 | Survey / R1 | DONE |
| F6 | Custom Arabic Text Layer Component | Renders transparent DOM <span> elements with direction: rtl and unicode-bidi: isolate | M2 | Survey / R1 | DONE |
| F7 | Native Text Selection (window.getSelection()) | Guarantees contiguous, logical, correct Arabic string extraction on browser selection | M2 | Survey / R1 | DONE |
| F8 | UI & Toolbar Preservation | Exact layout, styles, and tools (Pan, Cursor, Highlight, Text, Eraser, Undo, Zoom) in #pdf-tools-portal | M2 | Survey / R2 | DONE |
| F9 | Annotation Overlay Sync & Scaling | Scale-invariant coordinate mathematics across 50% to 300% zoom levels | M2 | Survey / R2 | DONE |
| F10 | Note Persistence & Auto-Save | Frontmatter YAML serialization (pdf_notes) with debounced auto-save & flush triggers | M2 | Survey / R2 | DONE |
| F11 | E2E Test Runner & Harness | Automated runner for Arabic PDF rendering and text selection validation | M3 | Survey / Test Track | DONE |
| F12 | Tier 1: Feature Coverage Tests | >=5 test cases per feature (F1-F10) in isolation | M3 | Survey / Test Track | DONE |
| F13 | Tier 2: Boundary & Edge Case Tests | Tashkeel, mixed BiDi, multi-line, 50%/300% zoom, multi-page documents | M3 | Survey / Test Track | DONE |
| F14 | Tier 3: Cross-Feature Interaction Tests | Text selection + highlight drawing + zoom resize + persistence roundtrips | M3 | Survey / Test Track | DONE |
| F15 | Tier 4: Real-World Application Scenarios | Complete Arabic study document workflows (reading, selecting, annotating, saving) | M3 | Survey / Test Track | DONE |
| F16 | Tier 5: Adversarial Hardening & Audit | White-box stress tests, tamper detection, Next.js build validation, Forensic Audit | M4 | Survey / Gate | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Arabic BiDi & Unicode Normalizer | src/lib/pdf/arabic-bidi.ts | none | DONE |
| M2 | Arabic Text Layer & Viewer Integration | src/components/study/ArabicTextLayer.tsx, src/components/study/PdfNotebookViewer.tsx | M1 | DONE |
| M3 | E2E Test Suite (Tiers 1-4) | 	ests/unit/, 	ests/integration/, 	ests/e2e/, 	ests/verification/ | none | DONE |
| M4 | 100% E2E Pass, Tier 5 Hardening & Forensic Audit | Verification, stress testing, build check, forensic audit | M1, M2, M3 | DONE |

## Interface Contracts
### src/lib/pdf/arabic-bidi.ts
`	ypescript
export interface ProcessedTextItem {
  str: string;
  originalStr: string;
  dir: 'rtl' | 'ltr';
  isArabic: boolean;
  transform: number[];
  width: number;
  height: number;
  left: number;
  top: number;
  fontSize: number;
}

export interface ProcessedTextLine {
  items: ProcessedTextItem[];
  fullText: string;
  dir: 'rtl' | 'ltr';
  top: number;
  left: number;
  width: number;
  height: number;
}

export function normalizeArabicPresentationForms(text: string): string;
export function isArabicText(text: string): boolean;
export function reorderVisualToLogicalArabic(text: string): string;
export function processPageTextContent(textContent: any, viewport: any): ProcessedTextLine[];
`

### src/components/study/ArabicTextLayer.tsx
`	ypescript
export interface ArabicTextLayerProps {
  pageNumber: number;
  viewport: any;
  textContent: any;
  scale: number;
  page?: any;
  onTextExtracted?: (lines: ProcessedTextLine[]) => void;
  className?: string;
}
`

### src/components/study/PdfNotebookViewer.tsx
`	ypescript
export interface PdfNotebookViewerProps {
  pdfUrl: string;
  noteId?: string;
  notePath?: string;
  initialNotesStr?: string;
  isDark?: boolean;
  onUpdateNote?: (noteId: string, updates: { content?: string; frontmatter?: any }) => void;
}
`

## Code Layout
- src/lib/pdf/arabic-bidi.ts: Arabic presentation form normalization, BiDi heuristics, line clustering.
- src/components/study/ArabicTextLayer.tsx: DOM text layer rendering with RTL isolation.
- src/components/study/PdfNotebookViewer.tsx: Host PDF viewer component with portal toolbar & annotation overlay.
- 	ests/unit/arabic-bidi.test.ts: Unit tests for normalization, BiDi reversal, diacritics, and clustering.
- 	ests/integration/arabic-text-selection.test.ts: Text selection and DOM bounding box integration tests.
- 	ests/e2e/arabic-pdf-viewer.test.ts: E2E tests for toolbar tools, coordinate scaling, and persistence.
- 	ests/verification/verify-arabic-pdf-engine.ts: Master verification harness for all acceptance criteria.
