import sys
import re

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r'\s*\{/\* PDF Toolbar \*/\}.*?(?=\s*<div className="w-fit mx-auto relative flex flex-col items-center">)'

toolbar_content = """
          {/* PDF Toolbar rendered in portal */}
          {toolsPortal && createPortal(
             <div className="flex items-center gap-1.5">
               <button onClick={() => setPdfTool('pan')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'pan' ? 'text-purple-400 bg-purple-500/20' : 'text-slate-400 hover:text-white'}`} title="Pan Tool"><Hand size={16}/></button>
               <button onClick={() => setPdfTool('cursor')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'cursor' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`} title="Pointer Tool"><MousePointer2 size={16}/></button>
               <button onClick={() => setPdfTool('highlight')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'highlight' ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`} title="Highlighter Tool"><Highlighter size={16}/></button>
               
               <button onClick={() => setPdfTool('text')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'text' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-purple-400'}`} title="Text Note Tool"><Type size={16}/></button>
               {pdfTool === 'text' && (
                   <div className="flex items-center gap-1 mx-1 bg-slate-800 rounded-lg p-1">
                     {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#9333ea', '#ec4899', '#ffffff', '#000000'].map(c => (
                       <button key={c} onPointerDown={(e) => e.preventDefault()} onClick={() => { setTextColor(c); if (pendingText) setPendingText({ ...pendingText, color: c }); }} className={`w-4 h-4 rounded-full border ${textColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />
                     ))}
                   </div>
               )}
               
               <button onClick={() => setPdfTool('eraser')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'eraser' ? 'bg-pink-500/20 text-pink-400' : 'text-slate-400 hover:text-pink-400'}`} title="Eraser Tool"><Eraser size={16}/></button>
               <button onClick={handleUndo} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white" title="Undo Annotation"><Undo2 size={16}/></button>
               
               <div className="w-px h-4 bg-slate-700/50 mx-1"></div>
               <button onClick={() => setShowNotes(!showNotes)} className={`p-1.5 rounded-lg transition-colors ${showNotes ? 'text-blue-400 bg-blue-500/20' : 'text-slate-400 hover:text-white'}`} title="Toggle Notes Panel"><Sidebar size={16}/></button>
               <div className="w-px h-4 bg-slate-700/50 mx-1"></div>
               
               <button onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white" title="Zoom Out">
                 <ZoomOut size={16}/>
               </button>
               <div className="text-xs font-mono text-slate-400 font-bold min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</div>
               <button onClick={() => setZoomLevel(z => Math.min(z + 0.25, 3.0))} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white" title="Zoom In">
                 <ZoomIn size={16}/>
               </button>
             </div>,
             toolsPortal
          )}
"""

new_code = re.sub(pattern, toolbar_content, code, flags=re.DOTALL)
if new_code != code:
    print("Replaced toolbar")
    with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
        f.write(new_code)
else:
    print("Failed to replace toolbar")
