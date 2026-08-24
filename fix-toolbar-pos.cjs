const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

code = code.replace(/className="absolute top-4 left-1\/2 -translate-x-1\/2 flex items-center/, 'className="sticky top-2 mb-4 left-1/2 -translate-x-1/2 flex items-center');

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed toolbar pos');
