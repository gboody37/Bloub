const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// 1. Fix the highlight onMouseDown/onTouchStart
const brokenHighlightEvents = `onMouseDown={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } else if (pdfTool === 'cursor' || pdfTool === 'text') { e.stopPropagation(); setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id }); setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }} 
                          onTouchStart={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } else if (pdfTool === 'cursor' || pdfTool === 'text') { e.stopPropagation(); setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id }); setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }}`;

const fixedHighlightEvents = `onMouseDown={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }} 
                          onTouchStart={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }}`;

// We only want to replace it for ann.type === 'highlight'
// Let's use a regex that matches the highlight block
code = code.replace(
  /if \(ann\.type === 'highlight'\) \{[\s\S]*?className=\{`absolute/g,
  (match) => {
    return match.replace(brokenHighlightEvents, fixedHighlightEvents);
  }
);

// 2. Fix the color picker so it updates pendingText.color if it's active
code = code.replace(
  /onClick=\{\(\) => setTextColor\(c\)\}/g,
  "onClick={() => { setTextColor(c); if (pendingText) setPendingText({ ...pendingText, color: c }); }}"
);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed highlight bug and color picker bug');
