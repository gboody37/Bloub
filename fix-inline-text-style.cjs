const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

const pendingTextJsx = `
                 {pendingText && (
                   <input
                     autoFocus
                     type="text"
                     dir="auto"
                     value={pendingText.text}
                     onChange={(e) => setPendingText({ ...pendingText, text: e.target.value })}
                     onBlur={() => {
                       if (pendingText.text.trim()) {
                         setAnnotations(prev => ({
                           ...prev,
                           [pageNumber]: [...(prev[pageNumber] || []), { id: Date.now(), type: 'text', ...pendingText }]
                         }));
                       }
                       setPendingText(null);
                       setPdfTool('cursor');
                     }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.currentTarget.blur();
                       }
                       if (e.key === 'Escape') {
                         setPendingText(null);
                         setPdfTool('cursor');
                       }
                     }}
                     className="absolute text-purple-600 font-bold text-3xl bg-transparent px-2 py-1 border-2 border-dashed border-purple-500/50 outline-none pointer-events-auto min-w-[200px]"
                     style={{ 
                       left: pendingText.x * zoomLevel, 
                       top: pendingText.y * zoomLevel,
                       fontFamily: pendingText.text.match(/[\u0600-\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)'
                     }}
                   />
                 )}
`;

code = code.replace(/\{pendingText && \([\s\S]*?\}\)/, pendingTextJsx);

// Update rendered text to support Arabic/English fonts automatically
const textRender = `return <div key={ann.id} onMouseDown={(e) => { if(pdfTool==='eraser') { e.stopPropagation(); setAnnotations(p => ({...p, [pageNumber]: p[pageNumber].filter(a => a.id !== ann.id)})); } }} onTouchStart={(e) => { if(pdfTool==='eraser') { e.stopPropagation(); setAnnotations(p => ({...p, [pageNumber]: p[pageNumber].filter(a => a.id !== ann.id)})); } }} className="absolute text-purple-600 font-bold text-3xl bg-transparent px-2 py-1 whitespace-pre pointer-events-auto" style={{ left: ann.x * zoomLevel, top: ann.y * zoomLevel, fontFamily: ann.text.match(/[\\u0600-\\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)' }} dir="auto">{ann.text}</div>;`;
code = code.replace(/return <div key=\{ann\.id\} onMouseDown=\{[\s\S]*?\{ann\.text\}<\/div>;/, textRender);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed inline text styles');
