const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

code = code.replace(/\{pendingText && \([\s\S]*?<Page/m, `{pendingText && (
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
                       fontFamily: pendingText.text.match(/[\\u0600-\\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)'
                     }}
                   />
                 )}
               </div>
               <Page`);
               
fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed JSX');
