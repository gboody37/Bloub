import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("\\'pan\\'", "'pan'")
code = code.replace("\\'touch-none\\'", "'touch-none'")
code = code.replace("\\'\\'", "''")

with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Fixed backslashes")
