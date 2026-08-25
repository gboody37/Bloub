import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """                        <div 
                          key={ann.id} 
                          onMouseDown={(e) => { 
                            if (pdfTool === 'eraser') { 
                              e.stopPropagation(); 
                              isDirtyRef.current = true;
                              setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); 
                            } 
                          }} 
                          onTouchStart={(e) => { 
                            if (pdfTool === 'eraser') { 
                              e.stopPropagation(); 
                              isDirtyRef.current = true;
                              setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); 
                            } 
                          }} 
                          className={`absolute font-bold bg-transparent px-2 py-1 whitespace-pre select-none ${pdfTool === 'eraser' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`} 
                          style={{ 
                            left: ann.x * zoomLevel, 
                            top: ann.y * zoomLevel, 
                            fontSize: `${Math.max(12, Math.round(24 * zoomLevel))}px`,
                            lineHeight: 1.2,
                            fontFamily: (ann.text || '').match(/[\u0600-\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)', 
                            color: ann.color || '#9333ea',
                            pointerEvents: pdfTool === 'eraser' ? 'auto' : 'none'
                          }} 
                          dir="auto"
                        >"""

replacement = """                        <div 
                          key={ann.id} 
                          onMouseDown={(e) => { 
                            if (pdfTool === 'eraser') { 
                              e.stopPropagation(); 
                              isDirtyRef.current = true;
                              setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); 
                            } else if (pdfTool === 'cursor' || pdfTool === 'text') {
                              e.stopPropagation();
                              setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id });
                              setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) }));
                            }
                          }} 
                          onTouchStart={(e) => { 
                            if (pdfTool === 'eraser') { 
                              e.stopPropagation(); 
                              isDirtyRef.current = true;
                              setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); 
                            } else if (pdfTool === 'cursor' || pdfTool === 'text') {
                              e.stopPropagation();
                              setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id });
                              setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) }));
                            }
                          }} 
                          className={`absolute font-bold bg-transparent px-2 py-1 whitespace-pre select-none ${(pdfTool === 'eraser' || pdfTool === 'cursor' || pdfTool === 'text') ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`} 
                          style={{ 
                            left: ann.x * zoomLevel, 
                            top: ann.y * zoomLevel, 
                            fontSize: `${Math.max(12, Math.round((ann.fontSize || 24) * zoomLevel))}px`,
                            lineHeight: 1.2,
                            fontFamily: (ann.text || '').match(/[\u0600-\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)', 
                            color: ann.color || '#9333ea',
                          }} 
                          dir="auto"
                        >"""

if target in code:
    code = code.replace(target, replacement)
    with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print('Fixed text annotation render block')
else:
    print('Could not find text annotation render block')
