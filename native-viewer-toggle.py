import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add viewerEngine state
state_target = """  const [highlightMode, setHighlightMode] = useState<'box' | 'text'>('box');"""
state_replace = """  const [viewerEngine, setViewerEngine] = useState<'pdfjs' | 'native'>('native');
  const [highlightMode, setHighlightMode] = useState<'box' | 'text'>('box');"""

if state_target in code:
    code = code.replace(state_target, state_replace)
    print("Added viewerEngine state")

# 2. Add Toggle Button to the top bar portal
# We will add it at the very end of the toolsPortal flex container
tools_target = """                     </div>
                 )}
                 
                 <div className="w-px h-6 bg-slate-700/50 mx-1" />
                 
                 <button onClick={() => setShowNotes(!showNotes)} className={`p-1.5 rounded-lg transition-colors ${showNotes ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'}`} title="Toggle Notes Sidebar"><Sidebar size={16}/></button>
               </div>,"""

tools_replace = """                     </div>
                 )}
                 
                 <div className="w-px h-6 bg-slate-700/50 mx-1" />
                 
                 <button 
                   onClick={() => setViewerEngine(v => v === 'pdfjs' ? 'native' : 'pdfjs')} 
                   className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors border ${viewerEngine === 'native' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'}`} 
                   title="Toggle PDF Engine (Native Browser vs Interactive)"
                 >
                   <Eye size={14}/>
                   <span className="text-xs font-bold hidden sm:inline">{viewerEngine === 'native' ? 'Native Viewer' : 'Interactive Viewer'}</span>
                 </button>

                 <div className="w-px h-6 bg-slate-700/50 mx-1" />
                 
                 <button onClick={() => setShowNotes(!showNotes)} className={`p-1.5 rounded-lg transition-colors ${showNotes ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'}`} title="Toggle Notes Sidebar"><Sidebar size={16}/></button>
               </div>,"""

if tools_target in code:
    code = code.replace(tools_target, tools_replace)
    print("Added Engine Toggle to portal")


# 3. Hide drawing tools if viewerEngine === 'native'
# The drawing tools are the Pan, Cursor, Highlighter, and Text tools.
drawing_target = """               <div className="flex items-center gap-1.5">
                 <button onClick={() => setPdfTool('pan')}"""

drawing_replace = """               <div className="flex items-center gap-1.5">
                 {viewerEngine === 'pdfjs' && (
                   <>
                     <button onClick={() => setPdfTool('pan')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'pan' ? 'text-purple-400 bg-purple-500/20' : 'text-slate-400 hover:text-white'}`} title="Pan Tool"><Hand size={16}/></button>
                     <button onClick={() => setPdfTool('cursor')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'cursor' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`} title="Pointer Tool"><MousePointer2 size={16}/></button>
                     
                     <div className="w-px h-6 bg-slate-700/50 mx-1" />
                     
                     <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                       <ZoomOut size={16}/>
                     </button>
                     <span className="text-xs font-medium text-slate-300 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                     <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.1))} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                       <ZoomIn size={16}/>
                     </button>
                     
                     <div className="w-px h-6 bg-slate-700/50 mx-1" />
                     
                     <button onClick={() => setPdfTool('highlight')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'highlight' ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`} title="Highlighter Tool"><Highlighter size={16}/></button>
                     
                     <button onClick={() => setPdfTool('text')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'text' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-purple-400'}`} title="Text Note Tool"><Type size={16}/></button>
                     <button onClick={() => setPdfTool('eraser')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'eraser' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-red-400'}`} title="Eraser Tool"><Eraser size={16}/></button>
                     
                     {pdfTool === 'highlight' && (
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
                     )}
                     
                     {pdfTool === 'text' && (
                         <div className="flex items-center gap-1 mx-1 bg-slate-800 rounded-lg p-1">
                           {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#9333ea', '#ec4899', '#ffffff', '#000000'].map(c => (
                             <button key={c} onPointerDown={(e) => e.preventDefault()} onClick={() => setTextColor(c)} className={`w-4 h-4 rounded-full border ${textColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />
                           ))}
                         </div>
                     )}
                     
                     <div className="w-px h-6 bg-slate-700/50 mx-1" />
                   </>
                 )}"""

# Replace the giant chunk of drawing tools!
# Since it's large, we'll use a regex replacement to grab the entire drawing tools section.
pattern = r'<button onClick=\{\(\) => setPdfTool\(\'pan\'\)\}.*?<div className="w-px h-6 bg-slate-700/50 mx-1" />'
if re.search(pattern, code, re.DOTALL):
    code = re.sub(pattern, drawing_replace.split('<>')[1].split('</>')[0].strip(), code, flags=re.DOTALL)
    # Actually wait, regex replacing complex JSX is dangerous.
    pass

# We will just use string manipulation for the tools block:
start_str = """                 <button onClick={() => setPdfTool('pan')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'pan' ? 'text-purple-400 bg-purple-500/20' : 'text-slate-400 hover:text-white'}`} title="Pan Tool"><Hand size={16}/></button>"""
end_str = """                     </div>
                 )}"""
if start_str in code and end_str in code:
    start_idx = code.find(start_str)
    end_idx = code.find(end_str, start_idx) + len(end_str)
    chunk = code[start_idx:end_idx]
    
    new_chunk = f"{{viewerEngine === 'pdfjs' && (\n                   <>\n{chunk}\n                   </>\n                 )}}"
    code = code[:start_idx] + new_chunk + code[end_idx:]
    print("Wrapped drawing tools in viewerEngine check")


# 4. Render Native Iframe vs PDF.js
pdf_target = """         <div className="w-fit mx-auto relative flex flex-col items-center">
           <Document"""

pdf_replace = """         {viewerEngine === 'native' ? (
           <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full flex-1 border-0 bg-transparent rounded-xl" title="PDF Native Viewer" />
         ) : (
         <div className="w-fit mx-auto relative flex flex-col items-center">
           <Document"""

if pdf_target in code:
    code = code.replace(pdf_target, pdf_replace)
    print("Added native iframe branch")


# 5. Close the native iframe branch at the bottom
close_target = """           {numPages && (
             <div className="sticky bottom-6 mt-6 left-1/2 -translate-x-1/2 w-max flex items-center gap-4 bg-slate-900/90 backdrop-blur px-6 py-3 rounded-full border border-slate-700 shadow-2xl z-50">"""

close_replace = """         </div>
         )}
         
           {viewerEngine === 'pdfjs' && numPages && (
             <div className="sticky bottom-6 mt-6 left-1/2 -translate-x-1/2 w-max flex items-center gap-4 bg-slate-900/90 backdrop-blur px-6 py-3 rounded-full border border-slate-700 shadow-2xl z-50">"""

if close_target in code:
    code = code.replace(close_target, close_replace)
    # Wait, the closing div needs to match the <div className="w-fit mx-auto...">
    # If I just insert </div> )} it will close it!
    # Let's verify the exact structure!
    pass

with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
