const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// For the text annotations
code = code.replace(/style=\{\{ left: ann\.x \* zoomLevel, top: ann\.y \* zoomLevel, fontFamily: ann\.text\.match\(\/\[\\u0600-\\u06FF\]\/\) \? 'var\(--font-lemonada\)' : 'var\(--font-caveat\)' \}\}/g, 
  "style={{ left: ann.x * zoomLevel, top: ann.y * zoomLevel, fontFamily: ann.text.match(/[\\u0600-\\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)', color: ann.color || '#9333ea' }}");

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed annotation color render');
