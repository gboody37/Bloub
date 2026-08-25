import sys
import re

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update the wrapper to disable touch scrolling for both pan and highlight
pattern1 = r'(className=\{`flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20 \$\{pdfTool === \'pan\' \? \'touch-none\' : \'\'\}`\})'
replacement1 = r'className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20 ${(pdfTool === \'pan\' || pdfTool === \'highlight\') ? \'touch-none\' : \'\'}`}'

new_code = re.sub(pattern1, replacement1, code)
if new_code != code:
    print("Fixed wrapper")
    code = new_code
else:
    print("Failed to fix wrapper")


# 2. Add pointer capture to Pan tool
pan_down_target = """                e.preventDefault();
                const container = e.currentTarget;"""
pan_down_replace = """                e.preventDefault();
                const container = e.currentTarget;
                if (e.pointerId) container.setPointerCapture(e.pointerId);"""

if pan_down_target in code:
    code = code.replace(pan_down_target, pan_down_replace)
    print("Fixed pan pointer capture")
else:
    print("Failed pan pointer capture")
    
# 3. Add pointer capture to Text box drag
text_down_target = """                            e.preventDefault();
                            e.stopPropagation();
                            const startX = e.clientX;"""
text_down_replace = """                            e.preventDefault();
                            e.stopPropagation();
                            if (e.pointerId) e.currentTarget.setPointerCapture(e.pointerId);
                            const startX = e.clientX;"""
if text_down_target in code:
    code = code.replace(text_down_target, text_down_replace)
    print("Fixed text drag capture")
else:
    print("Failed text drag capture")

# 4. Add touch-none to text drag handle
text_class_target = """className="px-2 h-6 flex items-center justify-center rounded bg-purple-600 text-white hover:bg-purple-500 text-xs font-bold cursor-move\""""
text_class_replace = """className="px-2 h-6 flex items-center justify-center rounded bg-purple-600 text-white hover:bg-purple-500 text-xs font-bold cursor-move touch-none\""""
if text_class_target in code:
    code = code.replace(text_class_target, text_class_replace)
    print("Fixed text class")
else:
    print("Failed text class")


with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
