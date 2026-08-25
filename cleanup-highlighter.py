import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

wrapper_target = """className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col py-6 px-6 relative bg-black/20 ${(pdfTool === 'pan' || pdfTool === 'highlight') ? 'touch-none' : ''}`}"""
wrapper_replace = """className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col py-6 px-6 relative bg-black/20 ${pdfTool === 'pan' ? 'touch-none' : ''}`}"""

if wrapper_target in code:
    code = code.replace(wrapper_target, wrapper_replace)
    print("Fixed wrapper target")
else:
    print("Failed to find wrapper target")
    
# also remove highlightStart from state
code = code.replace("const [highlightStart, setHighlightStart] = useState<{x:number,y:number}|null>(null);", "")
code = code.replace("const [highlightCurrent, setHighlightCurrent] = useState<{x:number,y:number}|null>(null);", "")

# also remove highlight div renderer
highlight_render = """                  {highlightStart && highlightCurrent && pdfTool === 'highlight' && (
                    <div 
                      className="absolute mix-blend-multiply pointer-events-none"
                      style={{
                        backgroundColor: highlightColor,
                        left: Math.min(highlightStart.x, highlightCurrent.x) * zoomLevel,
                        top: Math.min(highlightStart.y, highlightCurrent.y) * zoomLevel,
                        width: Math.abs(highlightCurrent.x - highlightStart.x) * zoomLevel,
                        height: Math.abs(highlightCurrent.y - highlightStart.y) * zoomLevel,
                      }}
                    />
                  )}"""
code = code.replace(highlight_render, "")

with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
