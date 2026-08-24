const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

code = code.replace(/ZoomIn, ZoomOut \} from 'lucide-react';/, "ZoomIn, ZoomOut, Eraser, Undo2 } from 'lucide-react';");

const undoLogic = `
  const handleUndo = () => {
    setAnnotations(prev => {
      const pageAnns = prev[pageNumber] || [];
      if (pageAnns.length === 0) return prev;
      return {
        ...prev,
        [pageNumber]: pageAnns.slice(0, -1)
      };
    });
  };
`;
code = code.replace(/const handleContainerMouseUp = \(e: React.MouseEvent\) => \{/, undoLogic + '\n  const handleContainerMouseUp = (e: React.MouseEvent) => {');

code = code.replace(/cursor: pdfTool === 'text' \? 'text' : pdfTool === 'highlight' \? 'text' : 'default' \}\}/, "cursor: pdfTool === 'text' ? 'text' : pdfTool === 'highlight' ? 'text' : pdfTool === 'eraser' ? 'crosshair' : 'default' }}");

code = code.replace(/className="absolute inset-0 z-20 pointer-events-none"/, 'className="absolute inset-0 z-20" style={{ pointerEvents: pdfTool === "eraser" ? "auto" : "none" }}');

const highlightRender = `return <div key={ann.id} onMouseDown={(e) => { if(pdfTool==='eraser') { e.stopPropagation(); setAnnotations(p => ({...p, [pageNumber]: p[pageNumber].filter(a => a.id !== ann.id)})); } }} className="absolute bg-yellow-400/40 mix-blend-multiply" style={{ left, top, width: w, height: h, pointerEvents: pdfTool === 'eraser' ? 'auto' : 'none' }} />;`;
code = code.replace(/return <div key=\{ann\.id\} className="absolute bg-yellow-400\/40 mix-blend-multiply" style=\{\{ left, top, width: w, height: h \}\} \/>;/, highlightRender);

const textRender = `return <div key={ann.id} onMouseDown={(e) => { if(pdfTool==='eraser') { e.stopPropagation(); setAnnotations(p => ({...p, [pageNumber]: p[pageNumber].filter(a => a.id !== ann.id)})); } }} className="absolute text-purple-600 font-bold text-lg bg-white/80 px-2 py-1 rounded shadow-sm border border-purple-200 whitespace-pre pointer-events-auto" style={{ left: ann.x * zoomLevel, top: ann.y * zoomLevel }}>{ann.text}</div>;`;
code = code.replace(/return <div key=\{ann\.id\} className="absolute text-purple-600 font-bold text-lg bg-white\/80 px-2 py-1 rounded shadow-sm border border-purple-200 whitespace-pre pointer-events-auto" style=\{\{ left: ann\.x \* zoomLevel, top: ann\.y \* zoomLevel \}\}>\{ann\.text\}<\/div>;/, textRender);

const toolbarAdditions = `
           <button onClick={() => setPdfTool('eraser')} className={\`p-1.5 rounded-lg transition-colors \${pdfTool === 'eraser' ? 'bg-pink-500/20 text-pink-400' : 'text-slate-400 hover:text-pink-400'}\`}><Eraser size={16}/></button>
           <button onClick={handleUndo} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white"><Undo2 size={16}/></button>`;
code = code.replace(/<Type size=\{16\}\/><\/button>/, "<Type size={16}/></button>\n" + toolbarAdditions);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Added eraser and undo');
