import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Fix the Pan Tool pointerdown bug
pan_target = """            onPointerDown={(e) => {
              if (pdfTool === 'pan') {
                e.preventDefault();
                const container = e.currentTarget;"""

pan_replace = """            onPointerDown={(e) => {
              // Don't intercept clicks on buttons or interactive elements
              if ((e.target as HTMLElement).closest('button, input, select, .pointer-events-auto')) return;
              
              if (pdfTool === 'pan') {
                e.preventDefault();
                const container = e.currentTarget;"""

if pan_target in code:
    code = code.replace(pan_target, pan_replace)
    print("Fixed pan tool preventDefault bug")
else:
    print("Failed to fix pan tool preventDefault bug")

# 2. Add pointercancel to handleUp for pan tool
handleUp_target = """                const handleUp = (ev: any) => {
                  if (ev.pointerId && container.hasPointerCapture(ev.pointerId)) {
                    container.releasePointerCapture(ev.pointerId);
                  }
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                };
                window.addEventListener('pointermove', handleMove);
                window.addEventListener('pointerup', handleUp);"""

handleUp_replace = """                const handleUp = (ev: any) => {
                  try {
                    if (ev.pointerId && container.hasPointerCapture && container.hasPointerCapture(ev.pointerId)) {
                      container.releasePointerCapture(ev.pointerId);
                    }
                  } catch (err) {}
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                  window.removeEventListener('pointercancel', handleUp);
                };
                window.addEventListener('pointermove', handleMove);
                window.addEventListener('pointerup', handleUp);
                window.addEventListener('pointercancel', handleUp);"""

if handleUp_target in code:
    code = code.replace(handleUp_target, handleUp_replace)
    print("Fixed pan tool pointercancel bug")
else:
    print("Failed to fix pan tool pointercancel bug")


# 3. Apply the same fix to pendingText drag handle
text_handleUp_target = """                            const handleUp = (ev: any) => {
                               try {
                                 if (ev.pointerId && ev.currentTarget && typeof ev.currentTarget.releasePointerCapture === 'function') {
                                   ev.currentTarget.releasePointerCapture(ev.pointerId);
                                 }
                               } catch (err) {}
                               window.removeEventListener('pointermove', handleMove);
                               window.removeEventListener('pointerup', handleUp);
                            };
                            window.addEventListener('pointermove', handleMove);
                            window.addEventListener('pointerup', handleUp);"""

text_handleUp_replace = """                            const handleUp = (ev: any) => {
                               try {
                                 if (ev.pointerId && ev.currentTarget && typeof ev.currentTarget.releasePointerCapture === 'function') {
                                   ev.currentTarget.releasePointerCapture(ev.pointerId);
                                 }
                               } catch (err) {}
                               window.removeEventListener('pointermove', handleMove);
                               window.removeEventListener('pointerup', handleUp);
                               window.removeEventListener('pointercancel', handleUp);
                            };
                            window.addEventListener('pointermove', handleMove);
                            window.addEventListener('pointerup', handleUp);
                            window.addEventListener('pointercancel', handleUp);"""

if text_handleUp_target in code:
    code = code.replace(text_handleUp_target, text_handleUp_replace)
    print("Fixed text drag pointercancel bug")
else:
    print("Failed to fix text drag pointercancel bug")


with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
