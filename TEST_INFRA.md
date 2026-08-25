# Vibe Todos — Arabic PDF Rendering & Interactive Annotation Test Infrastructure (`TEST_INFRA.md`)

## 1. Executive Summary & Test Philosophy
This document formalizes the automated test infrastructure, mathematical coordinate models, BiDi validation harnesses, persistence verification pipelines, and CI/CD runners for the **Arabic PDF Engine Overhaul & Annotation Tool Preservation** (Milestones M1–M4).

### Test Philosophy: Empirical, Opaque-Box & Multi-Tiered Verification
1. **Zero Cheating & Authentic Assertions**: All tests perform deep semantic, mathematical, DOM, and persistence assertions without mock passes or superficial string checks.
2. **Opaque-Box Architectural Validation**: Tests evaluate external contracts, observable DOM structures (`dir="rtl"`, `unicode-bidi: isolate`), native browser text selections (`window.getSelection()`), scale-invariant coordinate geometry, and Supabase YAML frontmatter roundtrips.
3. **Sub-Pixel Coordinate Invariance**: Visual annotations and text layer spans are tested against strict spatial deviation bounds (<= 1.5px) across continuous zoom levels (0.5x to 3.0x).
4. **Bidirectional (BiDi) & Arabic Orthographic Fidelity**: Validates Unicode Presentation Forms normalization (\uFB50..\uFDFF, \uFE70..\uFEFF -> \u0600..\u06FF), visual-to-logical reordering, mandatory Lam-Alef ligatures (\uFEFB..\uFEFC), Tashkeel preservation, and mixed LTR/RTL token isolation.

---

## 2. Feature Inventory (F1 through F15)

| ID | Category | Feature Name | Description | Target Milestone | Source Requirement |
|---|---|---|---|---|---|
| **F1** | Normalization | Unicode Presentation-Form Normalizer | Maps Presentation Forms-A/B (\uFB50..\uFEFF) to Canonical Arabic (\u0600..\u06FF) | M1 | Survey / R1.3 |
| **F2** | BiDi | Visual-to-Logical BiDi Reordering | Detects visual-order PDF streams and reorders Arabic glyphs to logical reading order | M1 | Survey / R1.1 |
| **F3** | Orthography | Diacritic & Ligature Preservation | Preserves Tashkeel (\u064B..\u0652) and handles Lam-Alef ligatures (\uFEFB..\uFEFC) | M1 | Survey / R1.4 |
| **F4** | Clustering | Text Item Line Clustering | Aggregates text items sharing vertical baseline into coherent line spans with bounding boxes | M1 | Survey / R1.1 |
| **F5** | BiDi | Mixed LTR/RTL Bidirectional Isolation | Isolates embedded numbers (Western/Eastern) and Latin words within Arabic lines | M1 | Survey / R1.5 |
| **F6** | Text Layer | Custom Arabic Text Layer Component | Renders transparent DOM `<span>` elements with `dir="rtl"` and `unicode-bidi: isolate` | M2 | Survey / R1.1 |
| **F7** | Selection | Native Text Selection (`window.getSelection()`) | Guarantees contiguous, logical, non-reversed Arabic string extraction on selection | M2 | Survey / R1.2 |
| **F8** | UI Portal | UI & Toolbar Preservation | Exact layout, styles, and tools (Pan, Cursor, Highlight, Text, Eraser, Undo, Zoom) in `#pdf-tools-portal` | M2 | Survey / R2.2 |
| **F9** | Geometry | Annotation Overlay Sync & Scaling | Scale-invariant coordinate mathematics across 50% to 300% zoom levels | M2 | Survey / R2.4 |
| **F10** | Persistence | Note Persistence & Auto-Save | Frontmatter YAML serialization (`pdf_notes`) with debounced auto-save & flush triggers | M2 | Survey / R2.5 |
| **F11** | Test Runner | E2E Test Runner & Harness | Unified master CLI runner executing all 4 tiers with structured pass/fail metrics | M3 | Test Track |
| **F12** | Tier 1 | Core Feature Coverage Suite | >= 5 test cases per feature (F1–F10) in isolation | M3 | Test Track |
| **F13** | Tier 2 | Boundary & Corner Case Suite | Tashkeel-heavy, mixed BiDi, multi-line, 50%/300% zoom, multi-page docs | M3 | Test Track |
| **F14** | Tier 3 | Cross-Feature Interaction Suite | Text selection + highlight drawing + zoom resize + persistence roundtrips | M3 | Test Track |
| **F15** | Tier 4 | Real-World Study Scenarios Suite | Complete realistic Arabic study workflows (Medical, Law, Language, Review, Offline) | M3 | Test Track |

---

## 3. Mathematical Foundations & Coordinate Geometry

### 3.1 Scale-Invariant Coordinate Normalization
Annotations are stored in unscaled page coordinates (x, y, w, h) independent of the current viewport zoom level scale in [0.5, 3.0]:

```
unscaledX = (clientClickX - containerRect.left) / scale
unscaledY = (clientClickY - containerRect.top) / scale
unscaledW = width / scale
unscaledH = height / scale
```

### 3.2 Visual Rendering Transformation Matrix
When rendering the interactive overlay onto the visual canvas at scale `s`:

```
renderedLeft = unscaledX * scale
renderedTop = unscaledY * scale
renderedWidth = unscaledW * scale
renderedHeight = unscaledH * scale
renderedFontSize = Math.round(baseFontSize * scale)
```

- **Sub-Pixel Invariance Threshold**: The spatial delta between the overlay element and the underlying PDF canvas glyph must satisfy `|deltaX| <= 1.5px` and `|deltaY| <= 1.5px`.

### 3.3 Text Item Line Clustering Algorithm
Text items from the PDF content stream are clustered into a single baseline line if their vertical centers `y_c` differ by less than vertical tolerance `epsilon`:

```
|y_c1 - y_c2| <= epsilon (where epsilon = Math.max(2.5, 0.3 * itemHeight))
```

For right-to-left lines, items are sorted from right to left:

```
sortOrder(a, b) = b.left - a.left
```

### 3.4 Resizer Divider Width Clamping Formula
The handwriting notes split pane width `notesWidth` is constrained by:

```
notesWidth = Math.max(200, Math.min(draggedWidth, containerWidth - 300))
```

---

## 4. Test Suite Architecture & Directory Layout

```
d:\AI\جبنة\vibe-todos\
├── tests/
│   ├── unit/
│   │   ├── arabic-presentation-forms.test.ts   # Tier 1 & 2: Normalization, BiDi, Tashkeel, Line clustering
│   │   └── pdf-annotation-math.test.ts         # Tier 1 & 2: Coordinate scaling, zoom matrices, clamping
│   ├── integration/
│   │   ├── arabic-text-selection.test.ts       # Tier 1, 2, 3: DOM text layer, selection range, highlight rects
│   │   └── pdf-annotation-persistence.test.ts  # Tier 1, 2, 3: YAML frontmatter, auto-save debounce, flush
│   ├── e2e/
│   │   ├── arabic-pdf-viewer.test.ts           # Tier 1, 2, 3: Toolbar buttons, undo stack, dual-pane layout
│   │   └── study-scenarios.test.ts             # Tier 4: Real-world study workflows (Scenarios 1–5)
│   └── verification/
│       └── verify-arabic-pdf-engine.ts         # Master CLI Acceptance Runner (Tiers 1–4)
├── TEST_INFRA.md                               # This documentation
└── TEST_READY.md                               # Completion signoff & verification matrix
```

---

## 5. Real-World Application Scenarios (Tier 4)

### Scenario 1: Medical & Engineering Note in Arabic with Formulas
- **Input Document**: Complex anatomy & biomechanics lecture notes containing Arabic headers (`علم وظائف الأعضاء`), Latin chemical symbols (`ATP -> ADP + Pi`), and Eastern Arabic table references (`شكل رقم ١-٤`).
- **Workflow**: Reader selects paragraph, applies Green highlight, adds inline Arabic note with Lemonada font at (150, 320), zooms to 175%, and confirms highlight alignment.

### Scenario 2: Arabic Law Document with Numbered Articles
- **Input Document**: Multi-page commercial statute with numbered legal articles (`المادة 124-أ: التزامات الشركاء`).
- **Workflow**: Reader performs multi-line text selection across 4 lines, applies Yellow highlight, clicks Eraser to remove line 2 highlight, uses Undo to restore, and verifies page-isolated state.

### Scenario 3: Language Learning PDF with Mixed English-Arabic Glossaries
- **Input Document**: Bilingual vocabulary guide with interleaved Arabic definitions and English phonetic transcriptions (`جبنة [Jibnah] - Cheese`).
- **Workflow**: Reader selects Arabic terms, adds English annotation notes in Caveat font and Arabic notes in Lemonada font, switches Pan tool to scroll, and verifies font auto-switching.

### Scenario 4: Fast Review Session with Rapid Navigation & Zooming
- **Input Document**: 10-page exam preparation PDF.
- **Workflow**: Reader rapidly navigates Page 1 -> Page 8 -> Page 3 -> Page 1, dynamically cycles zoom from 50% -> 125% -> 250% -> 100%, draws 15 highlight boxes, and verifies layout stability and zero coordinate drift.

### Scenario 5: Offline & Reload Resilience with In-Flight Auto-Save
- **Input Document**: Research paper with active note annotations.
- **Workflow**: Reader types text note without blurring input, modifies handwriting lined notepad, triggers immediate tab switch / browser reload, and verifies that Supabase frontmatter is safely serialized and reconstituted.

---

## 6. Execution Commands & Verification

```bash
# 1. Run all unit tests
node --experimental-strip-types --test tests/unit/arabic-presentation-forms.test.ts tests/unit/pdf-annotation-math.test.ts

# 2. Run all integration tests
node --experimental-strip-types --test tests/integration/arabic-text-selection.test.ts tests/integration/pdf-annotation-persistence.test.ts

# 3. Run all E2E & Study Scenario tests
node --experimental-strip-types --test tests/e2e/arabic-pdf-viewer.test.ts tests/e2e/study-scenarios.test.ts

# 4. Run the Master Verification Harness (All Tiers 1-4)
node --experimental-strip-types tests/verification/verify-arabic-pdf-engine.ts
```
