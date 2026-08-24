const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

const NEW_LOGIC = `
  const overlayRef = React.useRef<HTMLDivElement>(null);
  
  const handleContainerMouseUp = (e: React.MouseEvent) => {
    if (!overlayRef.current) return;
    const containerRect = overlayRef.current.getBoundingClientRect();
    
    if (pdfTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const x = (e.clientX - containerRect.left) / zoomLevel;
        const y = (e.clientY - containerRect.top) / zoomLevel;
        setAnnotations(prev => ({
          ...prev,
          [pageNumber]: [...(prev[pageNumber] || []), { id: Date.now(), type: 'text', x, y, text }]
        }));
        setPdfTool('cursor');
      }
      return;
    }
    
    if (pdfTool === 'highlight') {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const rects = Array.from(range.getClientRects());
        
        const newHighlights = rects.map((rect, i) => ({
          id: Date.now() + i,
          type: 'highlight',
          startX: (rect.left - containerRect.left) / zoomLevel,
          startY: (rect.top - containerRect.top) / zoomLevel,
          w: rect.width / zoomLevel,
          h: rect.height / zoomLevel
        }));

        setAnnotations(prev => ({
          ...prev,
          [pageNumber]: [...(prev[pageNumber] || []), ...newHighlights]
        }));
        
        selection.removeAllRanges();
      }
    }
  };
`;

code = code.replace(/const handleOverlayMouseDown = \([\s\S]*?setCurrentDraw\(null\);\n  };/, NEW_LOGIC);
code = code.replace(/const \[isDrawing, setIsDrawing\] = useState\(false\);\n  const \[currentDraw, setCurrentDraw\] = useState<any>\(null\);/, 'const overlayRef = React.useRef<HTMLDivElement>(null);');
// Remove duplicate overlayRef if any
code = code.replace(/const overlayRef = React\.useRef<HTMLDivElement>\(null\);\n\s*const overlayRef = React\.useRef<HTMLDivElement>\(null\);/, 'const overlayRef = React.useRef<HTMLDivElement>(null);');

const NEW_JSX = `
           <div className="relative inline-block shadow-2xl" ref={overlayRef} onMouseUp={handleContainerMouseUp} style={{ cursor: pdfTool === 'text' ? 'text' : pdfTool === 'highlight' ? 'text' : 'default' }}>
             <div className="absolute inset-0 z-20 pointer-events-none">
               {(annotations[pageNumber] || []).map(ann => {
                 if (ann.type === 'highlight') {
                   const w = Math.abs(ann.w) * zoomLevel;
                   const h = Math.abs(ann.h) * zoomLevel;
                   const left = ann.startX * zoomLevel;
                   const top = ann.startY * zoomLevel;
                   return <div key={ann.id} className="absolute bg-yellow-400/40 mix-blend-multiply" style={{ left, top, width: w, height: h }} />;
                 }
                 if (ann.type === 'text') {
                   return <div key={ann.id} className="absolute text-purple-600 font-bold text-lg bg-white/80 px-2 py-1 rounded shadow-sm border border-purple-200 whitespace-pre pointer-events-auto" style={{ left: ann.x * zoomLevel, top: ann.y * zoomLevel }}>{ann.text}</div>;
                 }
                 return null;
               })}
             </div>
             <Page 
               pageNumber={pageNumber} 
               renderTextLayer={true} 
               renderAnnotationLayer={true} 
               scale={zoomLevel} 
               className="rounded-lg overflow-hidden shadow-2xl transition-transform duration-300 transform-gpu"
             />
           </div>
`;

code = code.replace(/<div className="relative inline-block shadow-2xl">[\s\S]*?<\/div>\s*<\/div>/, NEW_JSX);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed text selection highlights');
