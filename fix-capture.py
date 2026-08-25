import sys
import re

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Pan
code = re.sub(
    r'(const container = e\.currentTarget;)',
    r'\1\n                if (e.pointerId) container.setPointerCapture(e.pointerId);',
    code
)

# Text Drag
code = re.sub(
    r'(const startX = e\.clientX;\s*const startY = e\.clientY;\s*const startPX = pendingText\.x;)',
    r'if (e.pointerId) e.currentTarget.setPointerCapture(e.pointerId);\n                            \1',
    code
)

with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Applied with regex")
