const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// 1. Import Hand
code = code.replace(
  "Undo2, Sidebar } from 'lucide-react';",
  "Undo2, Sidebar, Hand } from 'lucide-react';"
);

// 2. Add Hand button to toolbar
code = code.replace(
  /<button onClick=\{\(\) => setPdfTool\('cursor'\)\}/,
  `<button onClick={() => setPdfTool('pan')} className={\`p-1.5 rounded-lg transition-colors \${pdfTool === 'pan' ? 'text-purple-400 bg-purple-500/20' : 'text-slate-400 hover:text-white'}\`} title="Pan Tool"><Hand size={16}/></button>\n           <button onClick={() => setPdfTool('cursor')}`
);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Added Pan tool');
