import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Fix text box drag handle by adding touch-action-none
code = code.replace(
    """className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 text-xs cursor-move\"""",
    """className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 text-xs cursor-move touch-none\""""
)

# 2. Fix the color picker onBlur race condition by adding onPointerDown={e => e.preventDefault()}
code = code.replace(
    """onClick={() => { setTextColor(c); if (pendingText) setPendingText({ ...pendingText, color: c }); }}""",
    """onPointerDown={(e) => e.preventDefault()} onClick={() => { setTextColor(c); if (pendingText) setPendingText({ ...pendingText, color: c }); }}"""
)
code = code.replace(
    """onClick={() => setHighlightColor(c)}""",
    """onPointerDown={(e) => e.preventDefault()} onClick={() => setHighlightColor(c)}"""
)

# 3. Fix the Pan Tool drag on mobile by adding touch-none conditionally
# The wrapper div:
# <div 
#   className="flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20"
#   onPointerDown={(e) => {

wrapper_target = """         <div 
            className="flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20"
            onPointerDown="""

wrapper_replacement = """         <div 
            className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20 ${pdfTool === 'pan' ? 'touch-none' : ''}`}
            onPointerDown="""

if wrapper_target in code:
    code = code.replace(wrapper_target, wrapper_replacement)
else:
    print("Could not find wrapper target")

with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied fixes!")
