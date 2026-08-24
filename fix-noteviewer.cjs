const fs = require('fs');

let code = fs.readFileSync('src/components/study/NoteViewer.tsx', 'utf-8');

// Add import
if (!code.includes('PdfNotebookViewer')) {
  code = code.replace(
    "import type { ParsedObsidianNote } from '@/types/obsidian';",
    "import type { ParsedObsidianNote } from '@/types/obsidian';\nimport PdfNotebookViewer from './PdfNotebookViewer';"
  );
}

// Replace iframe block
const regex = /\{\/\* Main Visual Frame or Reader Mode \*\/\}\s*\{pdfViewMode === 'pdf' \? \(\s*<div className="flex-1 w-full min-h-\[550px\].*?<iframe.*?<\/div>\s*\) : \(/s;

const replacement = `{/* Main Visual Frame or Reader Mode */}
              {pdfViewMode === 'pdf' ? (
                <PdfNotebookViewer 
                  pdfUrl={pdfUrl} 
                  noteId={note.id} 
                  initialNotesStr={note.frontmatter?.pdf_notes} 
                  isDark={isDark} 
                />
              ) : (`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/components/study/NoteViewer.tsx', code);
console.log('Updated NoteViewer.tsx');
