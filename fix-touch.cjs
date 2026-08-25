const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// Container
code = code.replace(/onMouseUp=\{handleContainerMouseUp\}/, 'onMouseUp={handleContainerMouseUp} onTouchEnd={(e) => { e.preventDefault(); handleContainerMouseUp(e as any); }}');

// Resizer
code = code.replace(/onMouseDown=\{\(e\) => \{ e\.preventDefault\(\); setIsDragging\(true\); \}\}/, 'onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }} onTouchStart={(e) => { e.preventDefault(); setIsDragging(true); }}');

// Eraser clicks
code = code.replace(/onMouseDown=\{\(e\) => \{ if\(pdfTool==='eraser'\)/g, "onMouseDown={(e) => { if(pdfTool==='eraser') { e.stopPropagation(); setAnnotations(p => ({...p, [pageNumber]: p[pageNumber].filter(a => a.id !== ann.id)})); } }} onTouchStart={(e) => { if(pdfTool==='eraser')");

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Added touch events');
