const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

code = code.replace(/Highlighter, Type, MousePointer2/g, 'Highlighter, Type, MousePointer2, Maximize, Minimize');

code = code.replace(/const \[pdfTool, setPdfTool\] = useState\('cursor'\);/g, "const [pdfTool, setPdfTool] = useState('cursor');\n  const [isFitWidth, setIsFitWidth] = useState(false);");

const fillBtn = `<div className="w-px h-4 bg-slate-700 mx-1"></div>
           <button onClick={() => setIsFitWidth(!isFitWidth)} className={\`p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white\`}>
             {isFitWidth ? <Minimize size={16}/> : <Maximize size={16}/>}
           </button>`;

code = code.replace(/<Type size=\{16\}\/><\/button>/, "<Type size={16}/></button>\n           " + fillBtn);

code = code.replace(/width=\{450\}/, "width={isFitWidth ? undefined : 450} scale={isFitWidth ? 1.5 : 1.0}");

// Also add Tailwind classes to make the Page container responsive when filled
code = code.replace(/<Page([^>]*)className="rounded-lg overflow-hidden"/, '<Page$1className={`rounded-lg overflow-hidden transition-all duration-500 ${isFitWidth ? "w-full shadow-2xl" : ""}`}');


fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Added fill button');
