import sys
import re

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r"(<ZoomIn size=\{16\}\/>\s*<\/button>\s*<\/div>)\s*<Document"
replacement = r"""\1
         ) : (
           <button onClick={() => setShowPdfUi(true)} className="absolute top-4 left-4 p-2 rounded-full bg-slate-900/50 backdrop-blur text-slate-400 hover:text-white hover:bg-slate-800 z-50 transition-all shadow-lg border border-slate-700/50" title="Show UI">
             <Eye size={20}/>
           </button>
         )}
         <Document"""

new_code = re.sub(pattern, replacement, code)
if new_code != code:
    with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("Success")
else:
    print("Failed to replace")
