const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

code = code.replace(/import \{ ChevronLeft, ChevronRight, PenTool, Save, Check \} from 'lucide-react';/, "import { ChevronLeft, ChevronRight, PenTool, Save, Check, Highlighter, Type, MousePointer2 } from 'lucide-react';");

code = code.replace(/const \[saved, setSaved\] = useState\(false\);/, "const [saved, setSaved] = useState(false);\n  const [pdfTool, setPdfTool] = useState('cursor');");

const toolbar = `         {/* PDF Toolbar */}
         <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl z-50">
           <button onClick={() => setPdfTool('cursor')} className={\`p-1.5 rounded-lg transition-colors \${pdfTool === 'cursor' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200'}\`}><MousePointer2 size={16}/></button>
           <button onClick={() => setPdfTool('highlight')} className={\`p-1.5 rounded-lg transition-colors \${pdfTool === 'highlight' ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}\`}><Highlighter size={16}/></button>
           <button onClick={() => setPdfTool('text')} className={\`p-1.5 rounded-lg transition-colors \${pdfTool === 'text' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-purple-400'}\`}><Type size={16}/></button>
         </div>

         `;

code = code.replace(/<Document/, toolbar + '<Document');

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Added toolbar');
