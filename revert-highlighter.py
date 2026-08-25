import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()


# 1. Remove touch-none for highlight from the wrapper
wrapper_target = """className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col py-6 px-6 relative bg-black/20 ${(pdfTool === 'pan' || pdfTool === 'highlight') ? 'touch-none' : ''}`}"""
wrapper_replace = """className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col py-6 px-6 relative bg-black/20 ${pdfTool === 'pan' ? 'touch-none' : ''}`}"""
if wrapper_target in code:
    code = code.replace(wrapper_target, wrapper_replace)
    print("Fixed wrapper target")
else:
    print("Failed to find wrapper target")


# 2. Rip out freehand rectangle logic
# Specifically we replace the overlayRef handlers with a touchend/mouseup handler for text selection.

overlay_target = """             <div className="relative inline-block shadow-2xl" ref={overlayRef} onPointerDown={(e) => {
                    if (pdfTool === 'highlight') {
                      e.preventDefault();
                      const coords = getEventClientCoords(e);
                      if (!coords) return;
                      const containerRect = e.currentTarget.getBoundingClientRect();
                      const x = (coords.clientX - containerRect.left) / zoomLevel;
                      const y = (coords.clientY - containerRect.top) / zoomLevel;
                      setHighlightStart({ x, y });
                      setHighlightCurrent({ x, y });
                    }
                  }}
                  onPointerMove={(e) => {
                    if (pdfTool === 'highlight' && highlightStart) {
                      const coords = getEventClientCoords(e);
                      if (!coords) return;
                      const containerRect = e.currentTarget.getBoundingClientRect();
                      const x = (coords.clientX - containerRect.left) / zoomLevel;
                      const y = (coords.clientY - containerRect.top) / zoomLevel;
                      setHighlightCurrent({ x, y });
                    }
                  }}
                  onPointerUp={(e) => {
                    if (pdfTool === 'highlight' && highlightStart && highlightCurrent) {
                      const newAnn = {
                        id: Date.now(),
                        type: 'highlight',
                        startX: Math.min(highlightStart.x, highlightCurrent.x),
                        startY: Math.min(highlightStart.y, highlightCurrent.y),
                        w: Math.abs(highlightCurrent.x - highlightStart.x),
                        h: Math.abs(highlightCurrent.y - highlightStart.y),
                        color: highlightColor
                      };
                      isDirtyRef.current = true;
                      setAnnotations(prev => ({
                        ...prev,
                        [pageNumber]: [...(prev[pageNumber] || []), newAnn]
                      }));
                      setHighlightStart(null);
                      setHighlightCurrent(null);
                      setPdfTool('cursor');
                    }
                  }}
             >"""

overlay_replace = """             <div className="relative inline-block shadow-2xl" ref={overlayRef} 
                  onPointerUp={(e) => {
                    if (pdfTool === 'highlight') {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0 && selection.toString().trim().length > 0) {
                        const range = selection.getRangeAt(0);
                        const rects = range.getClientRects();
                        if (rects.length > 0 && overlayRef.current) {
                          const containerRect = overlayRef.current.getBoundingClientRect();
                          let saveAnnotations = { ...annotations };
                          
                          for (let i = 0; i < rects.length; i++) {
                            const rect = rects[i];
                            const newAnn = {
                              id: Date.now() + i,
                              type: 'highlight',
                              startX: (rect.left - containerRect.left) / zoomLevel,
                              startY: (rect.top - containerRect.top) / zoomLevel,
                              w: rect.width / zoomLevel,
                              h: rect.height / zoomLevel,
                              color: highlightColor,
                              text: selection.toString()
                            };
                            saveAnnotations = {
                              ...saveAnnotations,
                              [pageNumber]: [...(saveAnnotations[pageNumber] || []), newAnn]
                            };
                          }
                          isDirtyRef.current = true;
                          setAnnotations(saveAnnotations);
                          selection.removeAllRanges();
                          setPdfTool('cursor');
                        }
                      }
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (pdfTool === 'highlight') {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0 && selection.toString().trim().length > 0) {
                        const range = selection.getRangeAt(0);
                        const rects = range.getClientRects();
                        if (rects.length > 0 && overlayRef.current) {
                          const containerRect = overlayRef.current.getBoundingClientRect();
                          let saveAnnotations = { ...annotations };
                          
                          for (let i = 0; i < rects.length; i++) {
                            const rect = rects[i];
                            const newAnn = {
                              id: Date.now() + i,
                              type: 'highlight',
                              startX: (rect.left - containerRect.left) / zoomLevel,
                              startY: (rect.top - containerRect.top) / zoomLevel,
                              w: rect.width / zoomLevel,
                              h: rect.height / zoomLevel,
                              color: highlightColor,
                              text: selection.toString()
                            };
                            saveAnnotations = {
                              ...saveAnnotations,
                              [pageNumber]: [...(saveAnnotations[pageNumber] || []), newAnn]
                            };
                          }
                          isDirtyRef.current = true;
                          setAnnotations(saveAnnotations);
                          selection.removeAllRanges();
                          setPdfTool('cursor');
                        }
                      }
                    }
                  }}
             >"""

if overlay_target in code:
    code = code.replace(overlay_target, overlay_replace)
    print("Fixed overlay target")
else:
    print("Failed to find overlay target")


with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
