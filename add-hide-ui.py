import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add imports
code = code.replace(
    "Sidebar, Hand } from 'lucide-react';",
    "Sidebar, Hand, Eye, EyeOff } from 'lucide-react';"
)

# 2. Add state
code = code.replace(
    "const [isDragging, setIsDragging] = useState(false);",
    "const [isDragging, setIsDragging] = useState(false);\n  const [showPdfUi, setShowPdfUi] = useState(true);"
)

# 3. Wrap toolbar and add Eye/EyeOff buttons
toolbar_start = """<div className="sticky top-2 mb-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl z-50">"""
toolbar_end_line = """<div className="text-xs font-mono text-slate-400 font-bold min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</div>"""

if toolbar_start in code:
    print("Found toolbar_start")
    
    # We need to wrap the whole toolbar in {showPdfUi && ( ... )}
    # And add a button to hide it inside.
    # And a button to show it outside.
    
    parts = code.split(toolbar_start)
    before_toolbar = parts[0]
    rest = parts[1]
    
    # Find the end of the toolbar. The toolbar ends after the ZoomIn button div closes.
    # We can just look for `</button>\n         </div>\n\n         <Document`
    # Let's do a regex replacement on the whole return block if possible, or just string replace.
    
    # Actually, simpler way:
    # Replace the start of toolbar:
    new_toolbar_start = """{showPdfUi ? (
         <div className="sticky top-2 mb-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl z-50">
           <button onClick={() => setShowPdfUi(false)} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-red-400" title="Hide UI"><EyeOff size={16}/></button>
           <div className="w-px h-6 bg-slate-700/50 mx-1"></div>"""
    
    code = code.replace(toolbar_start, new_toolbar_start)
    
    # Replace the end of toolbar (the closing div of the sticky toolbar):
    # Wait, the closing div of the toolbar is right before `<Document`.
    toolbar_end_target = """             </button>
           </div>
  
           <Document """
           
    new_toolbar_end = """             </button>
           </div>
         ) : (
           <button onClick={() => setShowPdfUi(true)} className="absolute top-4 left-4 p-2 rounded-full bg-slate-900/50 backdrop-blur text-slate-400 hover:text-white hover:bg-slate-800 z-50 transition-all shadow-lg border border-slate-700/50" title="Show UI">
             <Eye size={20}/>
           </button>
         )}
  
           <Document """
           
    if toolbar_end_target in code:
        code = code.replace(toolbar_end_target, new_toolbar_end)
        print("Successfully replaced toolbar end")
    else:
        print("Could not find toolbar end target")
        
    with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
else:
    print("Could not find toolbar start")
