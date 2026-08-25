import sys
import re

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace all occurrences of ann.fontSize in pendingText block
code = re.sub(
    r'\{pendingText && \([\s\S]*?<\/[^>]*>\s*\)\}',
    """                  {pendingText && (
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
                          fontSize: `${Math.max(12, Math.round((pendingText.fontSize || 24) * zoomLevel))}px`,
                          lineHeight: 1.2,
                          fontFamily: pendingText.text.match(/[\u0600-\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)',
                          color: pendingText.color || textColor
                        }}
                      />
                    </div>
                  )}""",
    code
)

with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Regex applied to pendingText')
