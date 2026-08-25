const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// 1. Update pendingText type
code = code.replace(
  /useState<\{x: number, y: number, text: string, color\?: string\} \| null>/g,
  "useState<{x: number, y: number, text: string, color?: string, fontSize?: number, id?: number} | null>"
);

// 2. Allow clicking text annotations to edit them
code = code.replace(
  /className=\{`absolute font-bold bg-transparent px-2 py-1 whitespace-pre select-none \$\{pdfTool === 'eraser' \? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'\}`\}/g,
  "className={`absolute font-bold bg-transparent px-2 py-1 whitespace-pre select-none ${(pdfTool === 'eraser' || pdfTool === 'cursor' || pdfTool === 'text') ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}"
);

code = code.replace(
  /onMouseDown=\{\(e\) => \{\s*if \(pdfTool === 'eraser'\) \{([\s\S]*?)\}\s*\}\}/g,
  "onMouseDown={(e) => {\n                            if (pdfTool === 'eraser') { $1 }\n                            else if (pdfTool === 'cursor' || pdfTool === 'text') {\n                              e.stopPropagation();\n                              setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id });\n                              setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) }));\n                            }\n                          }}"
);

code = code.replace(
  /onTouchStart=\{\(e\) => \{\s*if \(pdfTool === 'eraser'\) \{([\s\S]*?)\}\s*\}\}/g,
  "onTouchStart={(e) => {\n                            if (pdfTool === 'eraser') { $1 }\n                            else if (pdfTool === 'cursor' || pdfTool === 'text') {\n                              e.stopPropagation();\n                              setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id });\n                              setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) }));\n                            }\n                          }}"
);

// Add fontSize to the annotation render style
code = code.replace(
  /fontSize: `\$\{Math\.max\(12, Math\.round\(24 \* zoomLevel\)\)\}px`,/g,
  "fontSize: `${Math.max(12, Math.round((ann.fontSize || 24) * zoomLevel))}px`,"
);

// 3. Update pendingText render logic
const newPendingRender = `                {pendingText && (
                    <div 
                      className="absolute z-50 flex flex-col gap-1"
                      style={{ 
                        left: pendingText.x * zoomLevel, 
                        top: pendingText.y * zoomLevel - 40
                      }}
                    >
                      <div className="flex items-center gap-1 bg-slate-800 p-1 rounded shadow-lg pointer-events-auto border border-slate-700">
                        <button 
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => setPendingText({ ...pendingText, fontSize: Math.max(12, (pendingText.fontSize || 24) - 2) })}
                          className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 text-xs font-bold"
                        >A-</button>
                        <button 
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => setPendingText({ ...pendingText, fontSize: Math.min(72, (pendingText.fontSize || 24) + 2) })}
                          className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 text-xs font-bold"
                        >A+</button>
                        <div 
                          onPointerDown={(e) => {
                            e.preventDefault();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const startPX = pendingText.x;
                            const startPY = pendingText.y;
                            const handleMove = (ev) => {
                               setPendingText(p => p ? { ...p, x: startPX + (ev.clientX - startX) / zoomLevel, y: startPY + (ev.clientY - startY) / zoomLevel } : p);
                            };
                            const handleUp = () => {
                               window.removeEventListener('pointermove', handleMove);
                               window.removeEventListener('pointerup', handleUp);
                            };
                            window.addEventListener('pointermove', handleMove);
                            window.addEventListener('pointerup', handleUp);
                          }}
                          className="px-2 h-6 flex items-center justify-center rounded bg-purple-600 text-white hover:bg-purple-500 text-xs font-bold cursor-move"
                        >
                          Drag to Move
                        </div>
                      </div>
                      <input
                        autoFocus
                        type="text"
                        dir="auto"
                        value={pendingText.text}
                        onChange={(e) => setPendingText({ ...pendingText, text: e.target.value })}
                        onBlur={() => {
                          if (pendingText.text.trim()) {
                            isDirtyRef.current = true;
                            setAnnotations(prev => ({
                              ...prev,
                              [pageNumber]: [...(prev[pageNumber] || []), { id: pendingText.id || Date.now(), type: 'text', ...pendingText }]
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
                        className="font-bold bg-transparent px-2 py-1 border-2 border-dashed border-purple-500/50 outline-none pointer-events-auto min-w-[150px]"
                        style={{ 
                          marginTop: '40px',
                          fontSize: \`\${Math.max(12, Math.round((pendingText.fontSize || 24) * zoomLevel))}px\`,
                          lineHeight: 1.2,
                          fontFamily: pendingText.text.match(/[\\u0600-\\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)',
                          color: pendingText.color || textColor
                        }}
                      />
                    </div>
                  )}`;

code = code.replace(
  /\{pendingText && \([\s\S]*?<\/[^>]*>\s*\)\}/,
  newPendingRender
);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed pendingText text dragging and sizing');
