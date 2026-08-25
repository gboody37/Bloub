const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// Add pendingText state
code = code.replace(/const \[isDragging, setIsDragging\] = useState\(false\);/, "const [isDragging, setIsDragging] = useState(false);\n    const [pendingText, setPendingText] = useState<{x: number, y: number, text: string} | null>(null);");

// Replace prompt logic
const newTextLogic = `
    if (pdfTool === 'text') {
      const x = (e.clientX - containerRect.left) / zoomLevel;
      const y = (e.clientY - containerRect.top) / zoomLevel;
      setPendingText({ x, y, text: '' });
      return;
    }
`;
code = code.replace(/if \(pdfTool === 'text'\) \{[\s\S]*?return;\n\s*\}/, newTextLogic);

// Add pendingText render
const pendingTextJsx = `
                 {pendingText && (
                   <input
                     autoFocus
                     type="text"
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
                     className="absolute text-purple-600 font-bold text-lg bg-white/80 px-2 py-1 rounded shadow-sm border-2 border-purple-500 outline-none pointer-events-auto"
                     style={{ left: pendingText.x * zoomLevel, top: pendingText.y * zoomLevel }}
                   />
                 )}
`;

code = code.replace(/\{currentDraw && currentDraw\.type === 'highlight' && \([\s\S]*?\}\)/, ''); // Clean up old currentDraw logic if present

// Inject pending text right after annotations map
code = code.replace(/return null;\n\s*\w*\}\)\}/, "return null;\n                 })}\n" + pendingTextJsx);


// Make Text Tool actually use proper font family!
code = code.replace(/className="absolute text-purple-600 font-bold text-lg bg-white\/80 px-2 py-1/g, 'className="absolute font-[family-name:var(--font-caveat)] text-purple-600 font-bold text-3xl bg-white/80 px-2 py-1');

// Make the input use it too
code = code.replace(/className="absolute text-purple-600 font-bold text-lg bg-white\/80 px-2 py-1 rounded shadow-sm border-2 border-purple-500 outline-none pointer-events-auto"/g, 'className="absolute font-[family-name:var(--font-caveat)] text-purple-600 font-bold text-3xl bg-white/80 px-2 py-1 rounded shadow-sm border-2 border-purple-500 outline-none pointer-events-auto"');


fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed inline text');
