const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// States
code = code.replace(/const \[isFitWidth, setIsFitWidth\] = useState\(false\);/, "const [isFitWidth, setIsFitWidth] = useState(false);\n  const [notesWidth, setNotesWidth] = useState(450);\n  const [isDragging, setIsDragging] = useState(false);");

// Handlers
const parentHandlers = `
  const handleParentMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    // Calculate new width from right edge of screen minus some padding
    const rect = e.currentTarget.getBoundingClientRect();
    const rightEdge = rect.right;
    const newWidth = rightEdge - e.clientX;
    setNotesWidth(Math.max(200, Math.min(newWidth, 800)));
  };
  const handleParentMouseUp = () => setIsDragging(false);
`;
code = code.replace(/const supabase = createClient\(\);/, parentHandlers + '\n  const supabase = createClient();');

// Root div
code = code.replace(/className=\{`flex flex-1 w-full min-h-\[650px\]/, 'onMouseMove={handleParentMouseMove} onMouseUp={handleParentMouseUp} onMouseLeave={handleParentMouseUp} className={`flex flex-1 w-full min-h-[650px]');
// To prevent text selection during drag
code = code.replace(/<div([^>]*className={`flex flex-1 w-full min-h-\[650px\])/, '<div style={{ userSelect: isDragging ? "none" : "auto" }} $1');

// Resizer
const resizer = `
       {/* Draggable Resizer */}
       <div 
         className="w-1.5 cursor-col-resize bg-transparent hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-20 relative flex-shrink-0"
         onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
       >
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-slate-600 rounded-full opacity-50 pointer-events-none"></div>
       </div>

       {/* Handwriting Notebook Side */}
       <div style={{ width: notesWidth }} className={\`flex-shrink-0 h-full border-l flex flex-col \${isDark ? 'border-slate-800 bg-[#12141c]' : 'border-gray-200 bg-[#fffdf5]'}\`}>`;

code = code.replace(/\{\/\* Handwriting Notebook Side \*\/\}[\s\S]*?<div className=\{`w-\[450px\] h-full border-l flex flex-col \$\{isDark \? 'border-slate-800 bg-\[#12141c\]' : 'border-gray-200 bg-\[#fffdf5\]'\}`\}>/, resizer);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Added resizer');
