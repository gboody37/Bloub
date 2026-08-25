const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

code = code.replace(/content\.replace\(\/pdf_notes:\\s\*'\.\*\?'\/g,/g, "content.replace(/pdf_notes:\\s*'.*?'/gs,");

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed dotAll regex');
