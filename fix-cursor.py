import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# I want to remove `setPdfTool('cursor');` from all places EXCEPT the actual button click handler.
# Let's just comment it out where it resets automatically!
code = code.replace("setPdfTool('cursor');", "// setPdfTool('cursor');")
# But wait, we MUST keep it working for the actual button.
code = code.replace("onClick={() => // setPdfTool('cursor')}", "onClick={() => setPdfTool('cursor')}")

with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Removed auto-resets to cursor")
