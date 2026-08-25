import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Change the wrapper definition
wrapper_target = """       <div 
          className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20 ${(pdfTool === 'pan' || pdfTool === 'highlight') ? 'touch-none' : ''}`}"""
wrapper_replace = """       <div className="flex-1 h-full relative overflow-hidden flex flex-col bg-black/20">
         <div className="absolute top-4 left-0 w-full flex justify-center z-50 pointer-events-none">
           <div className="pointer-events-auto flex relative">"""

if wrapper_target in code:
    code = code.replace(wrapper_target, wrapper_replace)
    print("Fixed wrapper target")
else:
    print("Could not find wrapper target")

# 2. Change the toolbar classes
toolbar_target = """         {showPdfUi ? (
         <div className="sticky top-2 mb-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl z-50">"""
toolbar_replace = """         {showPdfUi ? (
         <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl">"""
if toolbar_target in code:
    code = code.replace(toolbar_target, toolbar_replace)
    print("Fixed toolbar classes")
else:
    print("Could not find toolbar classes")

# 3. Change the end of the toolbar
end_target = """       ) : (
         <button onClick={() => setShowPdfUi(true)} className="absolute top-4 left-4 p-2 rounded-full bg-slate-900/50 backdrop-blur text-slate-400 hover:text-white hover:bg-slate-800 z-50 transition-all shadow-lg border border-slate-700/50" title="Show UI">
           <Eye size={20}/>
         </button>
       )}
       <Document"""
end_replace = """       ) : (
         <button onClick={() => setShowPdfUi(true)} className="p-2 rounded-full bg-slate-900/50 backdrop-blur text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-lg border border-slate-700/50" title="Show UI">
           <Eye size={20}/>
         </button>
       )}
           </div>
         </div>
         <div 
          className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative ${(pdfTool === 'pan' || pdfTool === 'highlight') ? 'touch-none' : ''}`}"""

if end_target in code:
    # Wait, the onPointerDown and style from earlier need to move down!
    # Ah, if I move the wrapper start, the onPointerDown will apply to the OUTER div!
    # That means panning will still work perfectly (or even better, it covers the whole area).
    # YES! If onPointerDown is on the outer div, it's fine! But wait... `e.currentTarget` for scrolling?
    # `container.scrollLeft` will fail because the outer div is `overflow-hidden`!
    pass

