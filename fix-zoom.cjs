const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

code = code.replace(/Maximize, Minimize/, 'ZoomIn, ZoomOut');
code = code.replace(/const \[isFitWidth, setIsFitWidth\] = useState\(false\);/, 'const [zoomLevel, setZoomLevel] = useState(1.0);');

const oldBtnRegex = /<button onClick=\{\(\) => setIsFitWidth\(!isFitWidth\)\}[\s\S]*?<\/button>/;
const newBtns = `<button onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white">
             <ZoomOut size={16}/>
           </button>
           <div className="text-xs font-mono text-slate-400 font-bold min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</div>
           <button onClick={() => setZoomLevel(z => Math.min(z + 0.25, 3.0))} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white">
             <ZoomIn size={16}/>
           </button>`;

code = code.replace(oldBtnRegex, newBtns);

// Replace overflow-y-auto with overflow-auto so it can scroll horizontally too!
// Wait, the PDF side div is:
// <div className="flex-1 h-full overflow-y-auto custom-scrollbar flex flex-col items-center py-6 relative bg-black/20">
code = code.replace(/overflow-y-auto custom-scrollbar flex flex-col items-center py-6 relative bg-black\/20/, 'overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20');

// Fix Page props
code = code.replace(/width=\{isFitWidth \? undefined : 450\} scale=\{isFitWidth \? 1\.5 : 1\.0\}/, 'scale={zoomLevel}');
code = code.replace(/className=\{`rounded-lg overflow-hidden transition-all duration-500 \$\{isFitWidth \? "w-full shadow-2xl" : ""\}`\}/, 'className="rounded-lg overflow-hidden shadow-2xl transition-transform duration-300 transform-gpu"');

// Fix drawing overlay scaling wrapper
// The overlay has width: w, height: h... wait, the overlay relies on clientX/clientY.
// When CSS transform scales it, the clientX/Y mapped directly to the overlay might be slightly off.
// But react-pdf's 'scale' prop natively re-renders the canvas at a larger size, it does NOT just CSS scale it! 
// This means the DOM size actually changes, so the client bounds are still accurate! We just need to make sure the overlay container resizes perfectly with the Page.

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed zoom');
