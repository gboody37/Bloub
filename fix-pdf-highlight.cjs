const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// Add highlightColor state
code = code.replace(
  "const [textColor, setTextColor] = useState('#9333ea'); // default purple-600",
  "const [textColor, setTextColor] = useState('#9333ea'); // default purple-600\n  const [highlightColor, setHighlightColor] = useState('#fef08a'); // default yellow-200"
);

// Add color picker for highlighter in toolbar
code = code.replace(
  /\{pdfTool === 'text' && \([\s\S]*?<\/[^>]*>\s*\)\}/,
  `{pdfTool === 'text' && (
                 <div className="flex items-center gap-1 mx-1 bg-slate-800 rounded-lg p-1">
                   {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#9333ea', '#ec4899', '#ffffff', '#000000'].map(c => (
                     <button key={c} onClick={() => setTextColor(c)} className={\`w-4 h-4 rounded-full border \${textColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'}\`} style={{ backgroundColor: c }} />
                   ))}
                 </div>
               )}
               {pdfTool === 'highlight' && (
                 <div className="flex items-center gap-1 mx-1 bg-slate-800 rounded-lg p-1">
                   {['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff'].map(c => (
                     <button key={c} onClick={() => setHighlightColor(c)} className={\`w-4 h-4 rounded-full border \${highlightColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'}\`} style={{ backgroundColor: c }} />
                   ))}
                 </div>
               )}`
);

// Update handleContainerMouseUp to use highlightColor
code = code.replace(
  /h: rect\.height \/ zoomLevel\s*\}\)\);/,
  "h: rect.height / zoomLevel,\n            color: highlightColor\n          }));"
);

// Update highlighter rendering to use the saved color
code = code.replace(
  /className="absolute mix-blend-multiply bg-yellow-400\/50/g,
  "className=\"absolute mix-blend-multiply\" style={{ backgroundColor: ann.color || '#facc1580', left, top, width: w, height: h, pointerEvents: (pdfTool === 'eraser' || pdfTool === 'cursor' || pdfTool === 'text' || pdfTool === 'highlight') ? 'auto' : 'none' }}"
);
code = code.replace(
  /style=\{\{ left, top, width: w, height: h, pointerEvents: \(pdfTool === 'eraser' \|\| pdfTool === 'cursor' \|\| pdfTool === 'text'\) \? 'auto' : 'none' \}\}/g,
  ""
);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Added highlighter colors');
