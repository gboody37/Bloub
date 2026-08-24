const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

const DRAWING_LOGIC = `
  // Annotation State
  const [annotations, setAnnotations] = useState<Record<number, any[]>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDraw, setCurrentDraw] = useState<any>(null);
  
  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pdfTool === 'cursor') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (pdfTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        setAnnotations(prev => ({
          ...prev,
          [pageNumber]: [...(prev[pageNumber] || []), { id: Date.now(), type: 'text', x, y, text }]
        }));
      }
      setPdfTool('cursor');
      return;
    }
    
    if (pdfTool === 'highlight') {
      setIsDrawing(true);
      setCurrentDraw({ id: Date.now(), type: 'highlight', startX: x, startY: y, w: 0, h: 0 });
    }
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !currentDraw || pdfTool !== 'highlight') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentDraw((prev: any) => ({
      ...prev,
      w: x - prev.startX,
      h: y - prev.startY
    }));
  };

  const handleOverlayMouseUp = () => {
    if (isDrawing && currentDraw) {
      setAnnotations(prev => ({
        ...prev,
        [pageNumber]: [...(prev[pageNumber] || []), currentDraw]
      }));
    }
    setIsDrawing(false);
    setCurrentDraw(null);
  };
`;

code = code.replace(/const supabase = createClient\(\);/, DRAWING_LOGIC + '\n  const supabase = createClient();');

// Also update handleSave to save annotations alongside notes
code = code.replace(/const notesJson = JSON\.stringify\(notes\)/, "const notesJson = JSON.stringify({ notes, annotations })");
// And parsing initial notes string
code = code.replace(/setNotes\(JSON\.parse\(initialNotesStr\)\);/, "const parsed = JSON.parse(initialNotesStr);\n        if (parsed.notes) {\n          setNotes(parsed.notes);\n          setAnnotations(parsed.annotations || {});\n        } else {\n          setNotes(parsed);\n        }");


const OVERLAY_JSX = `
           <div className="relative inline-block shadow-2xl">
             <div 
               className="absolute inset-0 z-10" 
               style={{ pointerEvents: pdfTool === 'cursor' ? 'none' : 'auto', cursor: pdfTool === 'text' ? 'text' : pdfTool === 'highlight' ? 'crosshair' : 'default' }}
               onMouseDown={handleOverlayMouseDown}
               onMouseMove={handleOverlayMouseMove}
               onMouseUp={handleOverlayMouseUp}
               onMouseLeave={handleOverlayMouseUp}
             >
               {(annotations[pageNumber] || []).map(ann => {
                 if (ann.type === 'highlight') {
                   const w = Math.abs(ann.w);
                   const h = Math.abs(ann.h);
                   const left = ann.w < 0 ? ann.startX + ann.w : ann.startX;
                   const top = ann.h < 0 ? ann.startY + ann.h : ann.startY;
                   return <div key={ann.id} className="absolute bg-yellow-400/40 mix-blend-multiply" style={{ left, top, width: w, height: h }} />;
                 }
                 if (ann.type === 'text') {
                   return <div key={ann.id} className="absolute text-purple-600 font-bold text-lg bg-white/80 px-2 py-1 rounded shadow-sm border border-purple-200 whitespace-pre" style={{ left: ann.x, top: ann.y }}>{ann.text}</div>;
                 }
                 return null;
               })}
               {currentDraw && currentDraw.type === 'highlight' && (
                 <div className="absolute bg-yellow-400/40 mix-blend-multiply border border-yellow-400/50" 
                      style={{ 
                        left: currentDraw.w < 0 ? currentDraw.startX + currentDraw.w : currentDraw.startX, 
                        top: currentDraw.h < 0 ? currentDraw.startY + currentDraw.h : currentDraw.startY, 
                        width: Math.abs(currentDraw.w), 
                        height: Math.abs(currentDraw.h) 
                      }} />
               )}
             </div>
             <Page 
               pageNumber={pageNumber} 
               renderTextLayer={true} 
               renderAnnotationLayer={true} 
               width={isFitWidth ? undefined : 450} scale={isFitWidth ? 1.5 : 1.0} 
               className={\`rounded-lg overflow-hidden transition-all duration-500 \${isFitWidth ? "w-full" : ""}\`}
             />
           </div>
`;

code = code.replace(/<Page[\s\S]*?className=\{`rounded-lg overflow-hidden transition-all duration-500[^\}]*\}[^\}]*\/>/, OVERLAY_JSX);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Added drawing logic');
