import sys
import re

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update imports
import_target = """import { ChevronLeft, ChevronRight, PenTool, Save, Check, Highlighter, Type, MousePointer2, ZoomIn, ZoomOut, Eraser, Undo2, Sidebar, Hand, Eye, EyeOff } from 'lucide-react';"""
import_replace = """import { ChevronLeft, ChevronRight, PenTool, Save, Check, Highlighter, Type, MousePointer2, ZoomIn, ZoomOut, Eraser, Undo2, Sidebar, Hand, Eye, EyeOff, Square, Baseline } from 'lucide-react';"""
if import_target in code:
    code = code.replace(import_target, import_replace)
    print("Added Square, Baseline to lucide-react")
else:
    print("Failed to add lucide-react imports")


# 2. Add highlightMode state
state_target = """  const [highlightStart, setHighlightStart] = useState<{x:number,y:number}|null>(null);"""
state_replace = """  const [highlightMode, setHighlightMode] = useState<'box' | 'text'>('box');
  const [highlightStart, setHighlightStart] = useState<{x:number,y:number}|null>(null);"""
if state_target in code:
    code = code.replace(state_target, state_replace)
    print("Added highlightMode state")
else:
    print("Failed to add highlightMode state")


# 3. Add global text selection useEffect
effect_target = """  useEffect(() => {
    isDirtyRef.current = true;
  }, [annotations]);"""

effect_replace = """  useEffect(() => {
    isDirtyRef.current = true;
  }, [annotations]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (pdfTool === 'highlight' && highlightMode === 'text') {
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
        }, 50);
      }
    };
    
    document.addEventListener('pointerup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('pointerup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [pdfTool, highlightMode, annotations, pageNumber, zoomLevel, highlightColor]);"""

if effect_target in code:
    code = code.replace(effect_target, effect_replace)
    print("Added global text highlighter effect")
else:
    print("Failed to add global text highlighter effect")


# 4. Modify touch-none logic on wrapper
wrapper_target = """className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col py-6 px-6 relative bg-black/20 ${(pdfTool === 'pan' || pdfTool === 'highlight') ? 'touch-none' : ''}`}"""
wrapper_replace = """className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col py-6 px-6 relative bg-black/20 ${(pdfTool === 'pan' || (pdfTool === 'highlight' && highlightMode === 'box')) ? 'touch-none' : ''}`}"""

if wrapper_target in code:
    code = code.replace(wrapper_target, wrapper_replace)
    print("Fixed touch-none")
else:
    print("Failed to fix touch-none")


# 5. Modify pointerEvents overlay
pointer_target = """<div className="absolute inset-0 z-20" style={{ pointerEvents: (pdfTool === "eraser" || pdfTool === "highlight" || pdfTool === "text") ? "auto" : "none" }}>"""
pointer_replace = """<div className="absolute inset-0 z-20" style={{ pointerEvents: (pdfTool === "eraser" || (pdfTool === "highlight" && highlightMode === "box") || pdfTool === "text") ? "auto" : "none" }}>"""

if pointer_target in code:
    code = code.replace(pointer_target, pointer_replace)
    print("Fixed pointerEvents")
else:
    print("Failed to fix pointerEvents")


# 6. Modify overlayRef pointer handlers
overlay_target_1 = """                    if (pdfTool === 'highlight') {
                      e.preventDefault();
                      const coords = getEventClientCoords(e);"""
overlay_replace_1 = """                    if (pdfTool === 'highlight' && highlightMode === 'box') {
                      e.preventDefault();
                      const coords = getEventClientCoords(e);"""

code = code.replace(overlay_target_1, overlay_replace_1)

overlay_target_2 = """                  onPointerMove={(e) => {
                    if (pdfTool === 'highlight' && highlightStart) {"""
overlay_replace_2 = """                  onPointerMove={(e) => {
                    if (pdfTool === 'highlight' && highlightMode === 'box' && highlightStart) {"""

code = code.replace(overlay_target_2, overlay_replace_2)

overlay_target_3 = """                    if (pdfTool === 'highlight' && highlightStart && highlightCurrent) {"""
overlay_replace_3 = """                    if (pdfTool === 'highlight' && highlightMode === 'box' && highlightStart && highlightCurrent) {"""

code = code.replace(overlay_target_3, overlay_replace_3)


# 7. Add toggle button to toolbar
color_target = """               {pdfTool === 'highlight' && (
                   <div className="flex items-center gap-1 mx-1 bg-slate-800 rounded-lg p-1">
                     {['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff'].map(c => (
                       <button key={c} onPointerDown={(e) => e.preventDefault()} onClick={() => setHighlightColor(c)} className={`w-4 h-4 rounded-full border ${highlightColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />
                     ))}
                   </div>
               )}"""

color_replace = """               {pdfTool === 'highlight' && (
                   <div className="flex items-center gap-1 mx-1 bg-slate-800 rounded-lg p-1">
                     <button 
                       onPointerDown={(e) => e.preventDefault()} 
                       onClick={() => setHighlightMode(m => m === 'box' ? 'text' : 'box')} 
                       className={`flex items-center gap-1 px-2 py-0.5 mr-1 rounded border border-slate-700 bg-slate-900 text-xs font-bold text-white transition-colors hover:bg-slate-700`}
                       title={highlightMode === 'box' ? "Switch to Text Selection Mode" : "Switch to Box Drawing Mode"}
                     >
                       {highlightMode === 'box' ? <Square size={12}/> : <Baseline size={12}/>}
                       <span className="hidden sm:inline">{highlightMode === 'box' ? 'Box' : 'Text'}</span>
                     </button>
                     {['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff'].map(c => (
                       <button key={c} onPointerDown={(e) => e.preventDefault()} onClick={() => setHighlightColor(c)} className={`w-4 h-4 rounded-full border ${highlightColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />
                     ))}
                   </div>
               )}"""

if color_target in code:
    code = code.replace(color_target, color_replace)
    print("Added toggle button")
else:
    print("Failed to add toggle button")


with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
