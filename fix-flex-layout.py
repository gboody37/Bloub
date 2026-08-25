import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove items-center from the scroll wrapper
wrapper_target = """className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20 ${(pdfTool === 'pan' || pdfTool === 'highlight') ? 'touch-none' : ''}`}"""
wrapper_replace = """className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col py-6 px-6 relative bg-black/20 ${(pdfTool === 'pan' || pdfTool === 'highlight') ? 'touch-none' : ''}`}"""
if wrapper_target in code:
    code = code.replace(wrapper_target, wrapper_replace)
    print("Fixed wrapper items-center")
else:
    print("Failed to find wrapper items-center")

# 2. Add wrapper around Document
doc_target = """         <Document 
            file={pdfUrl}"""
doc_replace = """         <div className="w-fit mx-auto relative flex flex-col items-center">
           <Document 
            file={pdfUrl}"""
if doc_target in code:
    code = code.replace(doc_target, doc_replace)
    print("Fixed Document start")
else:
    print("Failed Document start")

# 3. Close the Document wrapper
# The Document map ends with:
#                 ))}
#               </div>
#             </Page>
#           </Document>
#         </div>

doc_end_target = """          </Document>
       </div>"""
doc_end_replace = """          </Document>
         </div>
       </div>"""

if doc_end_target in code:
    code = code.replace(doc_end_target, doc_end_replace)
    print("Fixed Document end")
else:
    print("Failed Document end")

# 4. Also fix the toolbar width so it doesn't take up the whole width if we want it centered
toolbar_target = """className="sticky top-2 mb-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl z-50\""""
toolbar_replace = """className="sticky top-2 mb-4 left-1/2 -translate-x-1/2 w-max flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl z-50\""""

if toolbar_target in code:
    code = code.replace(toolbar_target, toolbar_replace)
    print("Fixed toolbar max width")
else:
    print("Failed toolbar max width")


with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
