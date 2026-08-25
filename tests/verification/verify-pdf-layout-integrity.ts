/**
 * Automated Verification Script: R2 - PDF Layout & Flex Constraints Verification
 * 
 * Verifies that:
 * 1. When `selectedNote` is active in `page.tsx`, the primary hero Mascot is suppressed (NOT rendered).
 * 2. When `selectedNote` is active, the NoteViewer container and outer main wrapper inherit full height
 *    constraints (`h-full` / `h-[100dvh]` / `min-h-0`).
 * 3. In `NoteViewer.tsx`, the PDF container expands to utilize 100% vertical space with `flex-1 h-full min-h-0`.
 * 4. In `PdfNotebookViewer.tsx`, the container uses dynamic flex `h-full flex-1 min-h-[500px]` instead of fixed `h-[650px]`.
 * 5. Fixed navigation bars and bottom spacers are hidden when `selectedNote` is active.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function verifyPdfLayoutIntegrity(): Promise<boolean> {
  console.log('\n======================================================================');
  console.log('▶ RUNNING R2 VERIFICATION: PDF Layout & Flex Constraints Integrity');
  console.log('======================================================================\n');

  const rootDir = process.cwd();
  const pagePath = path.resolve(rootDir, 'src/app/page.tsx');
  const noteViewerPath = path.resolve(rootDir, 'src/components/study/NoteViewer.tsx');
  const pdfViewerPath = path.resolve(rootDir, 'src/components/study/PdfNotebookViewer.tsx');

  const pageSource = fs.readFileSync(pagePath, 'utf8');
  const noteViewerSource = fs.readFileSync(noteViewerPath, 'utf8');
  const pdfViewerSource = fs.readFileSync(pdfViewerPath, 'utf8');

  // Check 1: Hero Mascot is suppressed when selectedNote is active
  console.log('[1/5] Verifying hero Mascot is conditionally suppressed when selectedNote is active in page.tsx...');
  const mascotCheck = pageSource.includes('{!selectedNote && (') && 
                     pageSource.includes('<BloubMascot size={showAddModal ? 96 : 160}');
  assert.ok(mascotCheck, 'Primary hero Mascot must be conditionally wrapped in {!selectedNote && (...)}');
  console.log('  ✔ Hero Mascot is successfully hidden when selectedNote is active.');

  // Check 2: main container inherits h-[100dvh] and overflow-hidden when selectedNote is active
  console.log('[2/5] Verifying main container layout constraints in page.tsx...');
  assert.ok(
    pageSource.includes("selectedNote ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-[100dvh] pb-24'"),
    'main wrapper must set h-[100dvh] max-h-[100dvh] overflow-hidden when selectedNote is truthy'
  );
  console.log('  ✔ main element correctly inherits h-[100dvh] max-h-[100dvh] overflow-hidden.');

  // Check 3: Content area and NoteViewer wrapper inherit h-full flex flex-col flex-1 min-h-0
  console.log('[3/5] Verifying NoteViewer and workspace wrappers flex hierarchy in page.tsx...');
  assert.ok(
    pageSource.includes("${selectedNote ? 'p-0 h-full' : 'px-6 py-6'}"),
    'Main content area must collapse padding and inherit h-full when selectedNote is truthy'
  );
  assert.ok(
    pageSource.includes('className={selectedNote ? "h-full flex flex-col min-h-0 flex-1" : ""}'),
    'Workspace wrapper must set h-full flex flex-col min-h-0 flex-1 when selectedNote is truthy'
  );
  assert.ok(
    pageSource.includes('className={selectedNote ? "h-full flex flex-col min-h-0 flex-1" : "space-y-5"}'),
    'Study workspace wrapper must set h-full flex flex-col min-h-0 flex-1 when selectedNote is truthy'
  );
  assert.ok(
    pageSource.includes('className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col flex-1 min-h-0"'),
    'NoteViewer container must have h-full flex flex-col flex-1 min-h-0'
  );
  console.log('  ✔ NoteViewer and all parent wrappers inherit full height and flex-1 constraints.');

  // Check 4: NoteViewer.tsx and PdfNotebookViewer.tsx layout stretching
  console.log('[4/5] Verifying NoteViewer.tsx and PdfNotebookViewer.tsx container constraints...');
  assert.ok(
    noteViewerSource.includes('className="flex flex-col h-full w-full relative font-sans"'),
    'NoteViewer root must be h-full w-full'
  );
  assert.ok(
    noteViewerSource.includes('className={`flex flex-col w-full h-full min-h-0 flex-1 gap-3'),
    'NoteViewer PDF container must have flex-1 h-full min-h-0'
  );
  assert.ok(
    pdfViewerSource.includes('flex w-full flex-1 h-full min-h-[500px] border rounded-2xl overflow-hidden'),
    'PdfNotebookViewer must utilize flex-1 h-full min-h-[500px] (no fixed h-[650px])'
  );
  assert.ok(
    !pdfViewerSource.includes('h-[650px]'),
    'PdfNotebookViewer must NOT have fixed h-[650px]'
  );
  console.log('  ✔ NoteViewer and PdfNotebookViewer stretch to fill all available vertical space.');

  // Check 5: Bottom nav and bottom spacer hidden when selectedNote is active
  console.log('[5/5] Verifying bottom navigation and spacer suppression in page.tsx...');
  assert.ok(
    pageSource.includes('isNavVisible && !selectedNote ? "bottom-0" : "-bottom-24"'),
    'Bottom navigation must be hidden offscreen when selectedNote is active'
  );
  assert.ok(
    pageSource.includes('{!selectedNote && <div className="h-20" />}'),
    'Bottom nav spacer must be hidden when selectedNote is active'
  );
  console.log('  ✔ Bottom navigation and spacer cleanly suppressed during note reading.');

  console.log('\n✔ R2 VERIFICATION PASSED: Full viewport height flexbox layout and Mascot suppression verified.\n');
  return true;
}

// Run if executed directly
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/')) || process.argv[1]?.includes('verify-pdf-layout-integrity')) {
  verifyPdfLayoutIntegrity()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ R2 Verification Failed:', err);
      process.exit(1);
    });
}
