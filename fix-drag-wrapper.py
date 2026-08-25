import sys
import re

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r'(className="flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20")'
replacement = r'className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20 ${pdfTool === \'pan\' ? \'touch-none\' : \'\'}`}'

new_code = re.sub(pattern, replacement, code)
if new_code != code:
    with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("Success")
else:
    print("Failed to replace")
