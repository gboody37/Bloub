import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

close_target = """           </Document>
         </div>
           
         {numPages && ("""

# wait, from the Get-Content it was:
#            </Document>
#            </div>
#           
#          {numPages && (

close_target_exact = """           </Document>
         </div>
           
         {numPages && ("""

# Actually I'll use regex to make it safer
import re

pattern = r'(</Document>\s*</div>)\s*\{numPages && \('
replace = r'\1\n         )}\n           \n         {viewerEngine === \'pdfjs\' && numPages && ('
if re.search(pattern, code):
    code = re.sub(pattern, replace, code)
    print("Closed native iframe branch safely")
else:
    print("Failed to close native iframe branch")


with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
