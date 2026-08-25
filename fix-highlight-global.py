import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add a global pointerup listener for the highlighter
# This guarantees we catch the end of text selection anywhere on the screen!

effect_target = """  useEffect(() => {
    isDirtyRef.current = true;
  }, [annotations]);"""

effect_replace = """  useEffect(() => {
    isDirtyRef.current = true;
  }, [annotations]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (pdfTool === 'highlight') {
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0 && selection.toString().trim().length > 0) {
            const range = selection.getRangeAt(0);
            const rects = range.getClientRects();
            if (rects.length > 0 && overlayRef.current) {
              const containerRect = overlayRef.current.getBoundingClientRect();
              let saveAnnotations = { ...annotations };
              
              for (let i = 0; i < rects.length; i++) {
                const rect = rects[i];
                // Only save rects that are inside our container
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
        }, 50); // Small delay to let browser finish selection
      }
    };
    
    document.addEventListener('pointerup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('pointerup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [pdfTool, annotations, pageNumber, zoomLevel, highlightColor]);"""

if effect_target in code:
    code = code.replace(effect_target, effect_replace)
    print("Added global highlight listener")
else:
    print("Failed to add global highlight listener")

with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
