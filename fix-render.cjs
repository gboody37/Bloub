const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

const correctRender = `               {(annotations[pageNumber] || []).map(ann => {
                 if (ann.type === 'highlight') {
                   const w = Math.abs(ann.w) * zoomLevel;
                   const h = Math.abs(ann.h) * zoomLevel;
                   const left = ann.startX * zoomLevel;
                   const top = ann.startY * zoomLevel;
                   return <div key={ann.id} onMouseDown={(e) => { if(pdfTool==='eraser') { e.stopPropagation(); setAnnotations(p => ({...p, [pageNumber]: p[pageNumber].filter(a => a.id !== ann.id)})); } }} onTouchStart={(e) => { if(pdfTool==='eraser') { e.stopPropagation(); setAnnotations(p => ({...p, [pageNumber]: p[pageNumber].filter(a => a.id !== ann.id)})); } }} className="absolute mix-blend-multiply bg-yellow-400/50 pointer-events-auto cursor-pointer" style={{ left, top, width: w, height: h }} title={ann.text} />;
                 }
                 if (ann.type === 'text') {
                   return <div key={ann.id} onMouseDown={(e) => { if(pdfTool==='eraser') { e.stopPropagation(); setAnnotations(p => ({...p, [pageNumber]: p[pageNumber].filter(a => a.id !== ann.id)})); } }} onTouchStart={(e) => { if(pdfTool==='eraser') { e.stopPropagation(); setAnnotations(p => ({...p, [pageNumber]: p[pageNumber].filter(a => a.id !== ann.id)})); } }} className="absolute font-bold text-3xl bg-transparent px-2 py-1 whitespace-pre pointer-events-auto" style={{ left: ann.x * zoomLevel, top: ann.y * zoomLevel, fontFamily: (ann.text || '').match(/[\\u0600-\\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)', color: ann.color || '#9333ea' }} dir="auto">{ann.text}</div>;
                 }
                 return null;
               })}`;

code = code.replace(/\{\(annotations\[pageNumber\] \|\| \[\]\)\.map\(ann => \{[\s\S]*?return null;\n\s*\}\)\}/, correctRender);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed annotation rendering');
