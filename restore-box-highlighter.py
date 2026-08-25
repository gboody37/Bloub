import sys
import re

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add back highlight state variables
state_target = """  const [highlightColor, setHighlightColor] = useState('#fef08a');"""
state_replace = """  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [highlightStart, setHighlightStart] = useState<{x:number,y:number}|null>(null);
  const [highlightCurrent, setHighlightCurrent] = useState<{x:number,y:number}|null>(null);"""

if state_target in code and "const [highlightStart" not in code:
    code = code.replace(state_target, state_replace)
    print("Added highlight state")

# 2. Add back the Freehand drawing logic to overlayRef
overlay_target = """             <div className="relative inline-block shadow-2xl" ref={overlayRef} 
                  onPointerDown={(e) => {
                    if (pdfTool === 'text') {
                      // let handleContainerMouseUp handle it
                    }
                  }}
                  onPointerUp={(e) => {
                    if (pdfTool === 'text') {
                      handleContainerMouseUp(e as any);
                    }
                  }} style={{ cursor: pdfTool === 'text' ? 'text' : pdfTool === 'highlight' ? 'text' : pdfTool === 'eraser' ? 'crosshair' : 'default' }}>"""

overlay_replace = """             <div className="relative inline-block shadow-2xl" ref={overlayRef} 
                  onPointerDown={(e) => {
                    if (pdfTool === 'text') {
                      // let handleContainerMouseUp handle it
                    }
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
                      e.preventDefault();
                      const coords = getEventClientCoords(e);
                      if (!coords) return;
                      const containerRect = e.currentTarget.getBoundingClientRect();
                      const x = (coords.clientX - containerRect.left) / zoomLevel;
                      const y = (coords.clientY - containerRect.top) / zoomLevel;
                      setHighlightCurrent({ x, y });
                    }
                  }}
                  onPointerUp={(e) => {
                    if (pdfTool === 'text') {
                      handleContainerMouseUp(e as any);
                    }
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
                  }} style={{ cursor: pdfTool === 'text' ? 'text' : pdfTool === 'highlight' ? 'crosshair' : pdfTool === 'eraser' ? 'crosshair' : 'default' }}>"""

if overlay_target in code:
    code = code.replace(overlay_target, overlay_replace)
    print("Replaced overlay logic")

# 3. Re-add touch-none to the main scroll wrapper so dragging highlights works on tablet
wrapper_target = """className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col py-6 px-6 relative bg-black/20 ${pdfTool === 'pan' ? 'touch-none' : ''}`}"""
wrapper_replace = """className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col py-6 px-6 relative bg-black/20 ${(pdfTool === 'pan' || pdfTool === 'highlight') ? 'touch-none' : ''}`}"""

if wrapper_target in code:
    code = code.replace(wrapper_target, wrapper_replace)
    print("Added touch-none for highlight")

# 4. Remove the global pointerup listener that used window.getSelection
effect_start = "  useEffect(() => {\n    const handleGlobalMouseUp = () => {"
# It goes until   }, [pdfTool, annotations, pageNumber, zoomLevel, highlightColor]);

pattern_effect = r'\s*useEffect\(\(\) => \{\n\s*const handleGlobalMouseUp = \(\) => \{.*?\n\s*\}, \[pdfTool, annotations, pageNumber, zoomLevel, highlightColor\]\);'
code = re.sub(pattern_effect, '', code, flags=re.DOTALL)
print("Removed global highlight listener")

# 5. Fix the pointerEvents overlay so that it intercepts pointer events for highlight drawing
pointer_target = """<div className="absolute inset-0 z-20" style={{ pointerEvents: (pdfTool === "eraser" || pdfTool === "cursor" || pdfTool === "text") ? "auto" : "none" }}>"""
pointer_replace = """<div className="absolute inset-0 z-20" style={{ pointerEvents: (pdfTool === "eraser" || pdfTool === "highlight" || pdfTool === "text") ? "auto" : "none" }}>"""

if pointer_target in code:
    code = code.replace(pointer_target, pointer_replace)
    print("Restored pointer events for highlight")


# 6. Render the live highlight box while dragging
render_box = """                  {(annotations[pageNumber] || []).map(ann => {"""
render_box_replace = """                  {highlightStart && highlightCurrent && pdfTool === 'highlight' && (
                    <div 
                      className="absolute pointer-events-none"
                      style={{
                        backgroundColor: (highlightColor && highlightColor.length === 7) ? highlightColor + '80' : highlightColor,
                        left: Math.min(highlightStart.x, highlightCurrent.x) * zoomLevel,
                        top: Math.min(highlightStart.y, highlightCurrent.y) * zoomLevel,
                        width: Math.abs(highlightCurrent.x - highlightStart.x) * zoomLevel,
                        height: Math.abs(highlightCurrent.y - highlightStart.y) * zoomLevel,
                      }}
                    />
                  )}
                  {(annotations[pageNumber] || []).map(ann => {"""

if render_box in code:
    code = code.replace(render_box, render_box_replace)
    print("Added live highlight render")

# 7. Add color picker back to the portal
color_target = """               {pdfTool === 'text' && (
                   <div className="flex items-center gap-1 mx-1 bg-slate-800 rounded-lg p-1">"""
color_replace = """               {pdfTool === 'highlight' && (
                   <div className="flex items-center gap-1 mx-1 bg-slate-800 rounded-lg p-1">
                     {['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff'].map(c => (
                       <button key={c} onPointerDown={(e) => e.preventDefault()} onClick={() => setHighlightColor(c)} className={`w-4 h-4 rounded-full border ${highlightColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />
                     ))}
                   </div>
               )}
               {pdfTool === 'text' && (
                   <div className="flex items-center gap-1 mx-1 bg-slate-800 rounded-lg p-1">"""

if color_target in code:
    code = code.replace(color_target, color_replace)
    print("Added color picker")

with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
