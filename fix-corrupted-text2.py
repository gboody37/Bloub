import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """                  if (ann.type === 'highlight') {
                    const w = Math.abs(ann.w) * zoomLevel;
                    const h = Math.abs(ann.h) * zoomLevel;
                    const left = ann.startX * zoomLevel;
                    const top = ann.startY * zoomLevel;
                    return (
                      <div 
                        key={ann.id} 
                        onMouseDown={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } else if (pdfTool === 'cursor' || pdfTool === 'text') { e.stopPropagation(); setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id }); setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }} 
                        onTouchStart={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } else if (pdfTool === 'cursor' || pdfTool === 'text') { e.stopPropagation(); setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id }); setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }} 
                        className={`absolute mix-blend-multiply bg-yellow-400/50 ${pdfTool === 'eraser' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`} 
                         
                        title={ann.text} 
                      />
                    );
                  }"""

replacement = """                  if (ann.type === 'highlight') {
                    const w = Math.abs(ann.w) * zoomLevel;
                    const h = Math.abs(ann.h) * zoomLevel;
                    const left = ann.startX * zoomLevel;
                    const top = ann.startY * zoomLevel;
                    return (
                      <div 
                        key={ann.id} 
                        onMouseDown={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }} 
                        onTouchStart={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }} 
                        className={`absolute mix-blend-multiply ${pdfTool === 'eraser' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`} 
                        style={{ backgroundColor: ann.color || '#facc1580', left, top, width: w, height: h }}
                        title={ann.text} 
                      />
                    );
                  }"""

if target in code:
    code = code.replace(target, replacement)
    
    # 2. Fix the color picker so it updates pendingText.color if it's active
    code = code.replace(
      "onClick={() => setTextColor(c)}",
      "onClick={() => { setTextColor(c); if (pendingText) setPendingText({ ...pendingText, color: c }); }}"
    )

    with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Fixed successfully!")
else:
    print("Target not found.")
