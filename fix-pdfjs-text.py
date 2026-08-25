import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's insert the options object before the return statement.
options_target = """  const toolsPortal = typeof document !== 'undefined' ? document.getElementById('pdf-tools-portal') : null;"""

options_replace = """  const options = {
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  };

  const toolsPortal = typeof document !== 'undefined' ? document.getElementById('pdf-tools-portal') : null;"""

if options_target in code:
    code = code.replace(options_target, options_replace)
    print("Added options object")

# Now add options={options} to <Document>
doc_target = """           <Document 
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}"""

doc_replace = """           <Document 
            file={pdfUrl}
            options={options}
            onLoadSuccess={onDocumentLoadSuccess}"""

if doc_target in code:
    code = code.replace(doc_target, doc_replace)
    print("Added options to Document")

with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
