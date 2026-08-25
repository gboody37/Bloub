const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// Fix the text tool race condition
code = code.replace(/if \(pdfTool === 'text'\) \{/, "if (pdfTool === 'text') {\n      if (pendingText) return; // Don't create a new box if they are just clicking to blur the current one\n");

// Add color state for text boxes
code = code.replace(/const \[pdfTool, setPdfTool\] = useState\('cursor'\);/, "const [pdfTool, setPdfTool] = useState('cursor');\n    const [textColor, setTextColor] = useState('#9333ea'); // default purple-600");

// Update pendingText to use textColor
code = code.replace(/setPendingText\(\{ x, y, text: '' \}\);/, "setPendingText({ x, y, text: '', color: textColor });");

// Update the pending text input to use the dynamic color
code = code.replace(/className="absolute text-purple-600 font-bold text-3xl bg-transparent px-2 py-1 border-2 border-dashed border-purple-500\/50 outline-none pointer-events-auto min-w-\[200px\]"/, 'className="absolute font-bold text-3xl bg-transparent px-2 py-1 border-2 border-dashed border-purple-500/50 outline-none pointer-events-auto min-w-[200px]"');
code = code.replace(/style=\{\{ \n\s*left: pendingText\.x \* zoomLevel, \n\s*top: pendingText\.y \* zoomLevel,\n\s*fontFamily: pendingText\.text\.match\(\/\[\\\\u0600-\\\\u06FF\]\/\) \? 'var\(--font-lemonada\)' : 'var\(--font-caveat\)'\n\s*\}\}/, "style={{ left: pendingText.x * zoomLevel, top: pendingText.y * zoomLevel, fontFamily: pendingText.text.match(/[\\u0600-\\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)', color: pendingText.color || textColor }}");

// Update rendered text annotations to use their saved color
code = code.replace(/className="absolute text-purple-600 font-bold text-3xl bg-transparent px-2 py-1 whitespace-pre pointer-events-auto"/, 'className="absolute font-bold text-3xl bg-transparent px-2 py-1 whitespace-pre pointer-events-auto"');
code = code.replace(/style=\{\{ left: ann\.x \* zoomLevel, top: ann\.y \* zoomLevel, fontFamily: ann\.text\.match\(\/\[\\\\u0600-\\\\u06FF\]\/\) \? 'var\(--font-lemonada\)' : 'var\(--font-caveat\)' \}\}/, "style={{ left: ann.x * zoomLevel, top: ann.y * zoomLevel, fontFamily: ann.text.match(/[\\u0600-\\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)', color: ann.color || '#9333ea' }}");


// Add color picker to toolbar when text tool is active
const colorPicker = `
             <button onClick={() => setPdfTool('text')} className={\`p-1.5 rounded-lg transition-colors \${pdfTool === 'text' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-purple-400'}\`}><Type size={16}/></button>
             {pdfTool === 'text' && (
               <div className="flex items-center gap-1 mx-1 bg-slate-800 rounded-lg p-1">
                 {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#9333ea', '#ec4899', '#ffffff', '#000000'].map(c => (
                   <button key={c} onClick={() => setTextColor(c)} className={\`w-4 h-4 rounded-full border \${textColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'}\`} style={{ backgroundColor: c }} />
                 ))}
               </div>
             )}
`;
code = code.replace(/<button onClick=\{\(\) => setPdfTool\('text'\)\}[\s\S]*?<Type size=\{16\}\/><\/button>/, colorPicker);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed text tool');
