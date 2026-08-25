const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// 1. Remove manual Save button
const saveBtnStart = "onClick={() => handleSave()}";
const saveBtnIdx = code.indexOf(saveBtnStart);
if (saveBtnIdx !== -1) {
  const start = code.lastIndexOf('<button', saveBtnIdx);
  const end = code.indexOf('</button>', saveBtnIdx) + 9;
  if (start !== -1 && end !== -1) {
    code = code.substring(0, start) + code.substring(end);
  }
}

// 2. Update pendingText type
code = code.replace(
  /useState<\{x: number, y: number, text: string, color\?: string\} \| null>/g,
  "useState<{x: number, y: number, text: string, color?: string, fontSize?: number, id?: number} | null>"
);

// 3. New text annotation creation
code = code.replace(
  /setPendingText\(\{ x, y, text: '', color: textColor \}\);/g,
  "setPendingText({ x, y, text: '', color: textColor, fontSize: 24 });"
);

// 4. Update ann pointerEvents and click
code = code.replace(
  /pointerEvents: pdfTool === 'eraser' \? 'auto' : 'none'/g,
  "pointerEvents: (pdfTool === 'eraser' || pdfTool === 'cursor' || pdfTool === 'text') ? 'auto' : 'none'"
);

code = code.replace(
  /className=\{`absolute font-bold bg-transparent px-2 py-1 whitespace-pre select-none \$\{pdfTool === 'eraser' \? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'\}`\}/g,
  "className={`absolute font-bold bg-transparent px-2 py-1 whitespace-pre select-none ${(pdfTool === 'eraser' || pdfTool === 'cursor' || pdfTool === 'text') ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}"
);

code = code.replace(
  /onMouseDown=\{\(e\) => \{\s*if \(pdfTool === 'eraser'\) \{\s*e\.stopPropagation\(\);\s*isDirtyRef\.current = true;\s*setAnnotations\(p => \(\{ \.\.\.p, \[pageNumber\]: \(p\[pageNumber\] \|\| \[\]\)\.filter\(a => a\.id !== ann\.id\) \}\)\);\s*\}\s*\}\}/g,
  "onMouseDown={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } else if (pdfTool === 'cursor' || pdfTool === 'text') { e.stopPropagation(); setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id }); setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }}"
);

code = code.replace(
  /onTouchStart=\{\(e\) => \{\s*if \(pdfTool === 'eraser'\) \{\s*e\.stopPropagation\(\);\s*isDirtyRef\.current = true;\s*setAnnotations\(p => \(\{ \.\.\.p, \[pageNumber\]: \(p\[pageNumber\] \|\| \[\]\)\.filter\(a => a\.id !== ann\.id\) \}\)\);\s*\}\s*\}\}/g,
  "onTouchStart={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } else if (pdfTool === 'cursor' || pdfTool === 'text') { e.stopPropagation(); setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id }); setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }}"
);

code = code.replace(
  /fontSize: `\$\{Math\.max\(12, Math\.round\(24 \* zoomLevel\)\)\}px`,/g,
  "fontSize: `${Math.max(12, Math.round((ann.fontSize || 24) * zoomLevel))}px`,"
);

// 5. Replace pendingText block manually
const targetBlock = `{pendingText && (
                  <input`;

const startIdx = code.indexOf(targetBlock);
if (startIdx !== -1) {
  // find the closing `)}`
  const endIdx = code.indexOf(')}', startIdx);
  if (endIdx !== -1) {
    const replacement = `{pendingText && (
                    <div 
                      className="absolute z-50 flex flex-col gap-1 pointer-events-none"
                      style={{ 
                        left: pendingText.x * zoomLevel, 
                        top: pendingText.y * zoomLevel - 30
                      }}
                    >
                      <div className="flex items-center gap-1 bg-slate-800 p-1 rounded shadow-lg pointer-events-auto border border-slate-700 w-max">
                        <button 
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingText({ ...pendingText, fontSize: Math.max(12, (pendingText.fontSize || 24) - 2) }); }}
                          className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 text-xs font-bold"
                        >A-</button>
                        <button 
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingText({ ...pendingText, fontSize: Math.min(72, (pendingText.fontSize || 24) + 2) }); }}
                          className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 text-xs font-bold"
                        >A+</button>
                        <div 
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
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
                          marginTop: '30px',
                          fontSize: \`\${Math.max(12, Math.round((pendingText.fontSize || 24) * zoomLevel))}px\`,
                          lineHeight: 1.2,
                          fontFamily: pendingText.text.match(/[\\u0600-\\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)',
                          color: pendingText.color || textColor
                        }}
                      />
                    </div>
                  `;
    code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  }
}

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Script ran successfully');
