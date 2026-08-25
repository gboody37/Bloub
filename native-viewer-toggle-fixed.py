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
start_str = """                 <button onClick={() => setPdfTool('pan')}"""
end_str = """                     </div>
                 )}"""
if start_str in code and end_str in code:
    start_idx = code.find(start_str)
    end_idx = code.find(end_str, start_idx) + len(end_str)
    chunk = code[start_idx:end_idx]
    
    # Check if we already wrapped it to prevent double wrapping
    if "{viewerEngine === 'pdfjs' && (" not in chunk:
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


with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
