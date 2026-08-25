import sys
import re

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# I want to change:
#        <div 
#           className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20 ${(pdfTool === 'pan' || pdfTool === 'highlight') ? 'touch-none' : ''}`}
#           onPointerDown={(e) => { ... }}
#           style={{ cursor: pdfTool === 'pan' ? 'grab' : 'default' }}
#         >
#                  {/* PDF Toolbar */}
#         {showPdfUi ? (
#         <div className="sticky top-2 mb-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl z-50">

# To:
#        <div className="flex-1 h-full relative overflow-hidden flex flex-col bg-black/20">
#           {/* Fixed PDF Toolbar */}
#           <div className="absolute top-4 left-0 w-full flex justify-center z-50 pointer-events-none">
#             <div className="pointer-events-auto">
#               {showPdfUi ? (
#                 <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl">
#                   ...
#               ) : (
#                 <button onClick={() => setShowPdfUi(true)} className="absolute top-0 left-4 p-2 rounded-full bg-slate-900/50 backdrop-blur text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-lg border border-slate-700/50" title="Show UI">
#                   <Eye size={20}/>
#                 </button>
#               )}
#             </div>
#           </div>
#           <div 
#             className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 ${(pdfTool === 'pan' || pdfTool === 'highlight') ? 'touch-none' : ''}`}
#             onPointerDown={(e) => { ... }}
#             style={{ cursor: pdfTool === 'pan' ? 'grab' : 'default' }}
#           >

# Then I need to close the extra div at the end of PDF Viewer Side.

pattern_start = r"""       <div \n          className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20 \$\{\(pdfTool === 'pan' \|\| pdfTool === 'highlight'\) \? 'touch-none' : ''\}`}"""
replacement_start = r"""       <div className="flex-1 h-full relative overflow-hidden flex flex-col bg-black/20">\n         <div className="absolute top-4 left-0 w-full flex justify-center z-50 pointer-events-none">\n           <div className="pointer-events-auto flex">"""

# Actually, doing this with regex is extremely fragile.
# Let's just use string slicing based on exact content!
