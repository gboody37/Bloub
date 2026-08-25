import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Fix pointer capture getting stuck by releasing it in handleUp for pan tool
pan_handleUp_target = """                const handleUp = () => {
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                };"""
pan_handleUp_replace = """                const handleUp = (ev: any) => {
                  if (ev.pointerId && container.hasPointerCapture(ev.pointerId)) {
                    container.releasePointerCapture(ev.pointerId);
                  }
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                };"""

if pan_handleUp_target in code:
    code = code.replace(pan_handleUp_target, pan_handleUp_replace)
    print("Fixed pan pointer capture")
else:
    print("Failed pan pointer capture")

# 2. Fix pointer capture getting stuck for text drag handle
text_handleUp_target = """                            const handleUp = () => {
                               window.removeEventListener('pointermove', handleMove);
                               window.removeEventListener('pointerup', handleUp);
                            };"""
text_handleUp_replace = """                            const handleUp = (ev: any) => {
                               if (ev.pointerId && ev.currentTarget && ev.currentTarget.hasPointerCapture && ev.currentTarget.hasPointerCapture(ev.pointerId)) {
                                 ev.currentTarget.releasePointerCapture(ev.pointerId);
                               }
                               window.removeEventListener('pointermove', handleMove);
                               window.removeEventListener('pointerup', handleUp);
                            };"""
if text_handleUp_target in code:
    code = code.replace(text_handleUp_target, text_handleUp_replace)
    print("Fixed text drag capture")
else:
    print("Failed text drag capture")


# 3. Fix text selection by letting pointer events pass through to the Page text layer when pdfTool === 'highlight'
pointer_target = """<div className="absolute inset-0 z-20" style={{ pointerEvents: (pdfTool === "eraser" || pdfTool === "cursor" || pdfTool === "text" || pdfTool === "highlight") ? "auto" : "none" }}>"""
pointer_replace = """<div className="absolute inset-0 z-20" style={{ pointerEvents: (pdfTool === "eraser" || pdfTool === "cursor" || pdfTool === "text") ? "auto" : "none" }}>"""

if pointer_target in code:
    code = code.replace(pointer_target, pointer_replace)
    print("Fixed pointer events overlay")
else:
    print("Failed pointer events overlay")

with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
