const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

code = code.replace(/content\.replace\(\/pdf_notes:\\s\*'\.\*\?'\/gs,/g, "content.replace(/pdf_notes:\\s*'([\\\\s\\\\S]*?)'/g,");

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed regex flag');
