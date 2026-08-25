const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

code = code.replace(/ZoomIn, ZoomOut, Eraser, Undo2 \} from 'lucide-react';/, "ZoomIn, ZoomOut, Eraser, Undo2, Sidebar } from 'lucide-react';");

code = code.replace(/const \[isDragging, setIsDragging\] = useState\(false\);/, "const [isDragging, setIsDragging] = useState(false);\n    const [showNotes, setShowNotes] = useState(true);");

code = code.replace(/\{\/\* Draggable Resizer \*\/\}/, '{showNotes && (<>\n         {/* Draggable Resizer */}');

// The end of Handwriting Notebook Side is after the textarea.
// It ends with:
//          />
//        </div>
code = code.replace(/(<textarea[\s\S]*?\/>\n\s*<\/div>)/, "$1\n         </>)}");

const toggleButton = `
           <div className="w-px h-6 bg-slate-700/50 mx-1"></div>
           <button onClick={() => setShowNotes(!showNotes)} className={\`p-1.5 rounded-lg transition-colors \${showNotes ? 'text-blue-400 bg-blue-500/20' : 'text-slate-400 hover:text-white'}\`} title="Toggle Notes Panel"><Sidebar size={16}/></button>
`;
code = code.replace(/(<button onClick=\{handleUndo\}[\s\S]*?<\/button>)/, "$1\n" + toggleButton);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Added notes toggle');
