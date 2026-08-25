import sys
import re

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# I want to replace everything from:
# <div className="relative inline-block shadow-2xl" ref={overlayRef} onPointerDown={(e) => {
# down to the start of style={{ cursor: ...
# There is a `}} style={{ cursor: pdfTool === 'text' ? 'text' : pdfTool === 'highlight' ? 'text' : pdfTool === 'eraser' ? 'crosshair' : 'default' }}>` line.

pattern = r'<div className="relative inline-block shadow-2xl" ref=\{overlayRef\} onPointerDown=\{.*?\}\} style=\{\{ cursor: '

replacement = """<div className="relative inline-block shadow-2xl" ref={overlayRef} 
                onPointerDown={(e) => {
                  if (pdfTool === 'text') {
                    // let handleContainerMouseUp handle it
                  }
                }}
                onPointerUp={(e) => {
                  if (pdfTool === 'text') {
                    handleContainerMouseUp(e as any);
                  }
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
                        }
                      }
                  }
                }} style={{ cursor: """

new_code = re.sub(pattern, replacement, code, flags=re.DOTALL)
if new_code != code:
    print("Replaced overlay logic")
    
    with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
        f.write(new_code)
else:
    print("Failed to replace overlay logic")
