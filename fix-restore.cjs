const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

const RESTORED_JSX = `           </div>
  
         </Document>
         
         {numPages && (
           <div className="sticky bottom-6 mt-6 flex items-center gap-4 bg-slate-900/90 backdrop-blur px-6 py-3 rounded-full border border-slate-700 shadow-2xl z-50">
               <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="p-1.5 text-white disabled:opacity-30 hover:bg-slate-800 rounded-full transition-colors"><ChevronLeft size={20}/></button>
               
               <div className="flex items-center gap-2 text-white text-xs tracking-widest font-bold uppercase">
                 <span>Page</span>
                 <input 
                   type="number" 
                   min={1} 
                   max={numPages || 1} 
                   value={pageNumber} 
                   onChange={(e) => {
                     const val = parseInt(e.target.value);
                     if (!isNaN(val)) setPageNumber(Math.min(Math.max(1, val), numPages || 1));
                   }}
                   className="w-12 text-center bg-slate-800/50 border border-slate-600 rounded py-0.5 outline-none focus:border-purple-400 focus:bg-slate-800 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                 />
                 <span>/ {numPages}</span>
               </div>

               <button onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))} disabled={pageNumber >= (numPages||1)} className="p-1.5 text-white disabled:opacity-30 hover:bg-slate-800 rounded-full transition-colors"><ChevronRight size={20}/></button>
             </div>
         )}
       </div>

       
       {/* Draggable Resizer */}
       <div 
         className="w-1.5 cursor-col-resize bg-transparent hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-20 relative flex-shrink-0"
         onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
       >
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-slate-600 rounded-full opacity-50 pointer-events-none"></div>
       </div>
`;

code = code.replace(/           <\/div>\s*\{\/\* Handwriting Notebook Side \*\/\}/, RESTORED_JSX + '\n         {/* Handwriting Notebook Side */}');

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Restored missing code');
