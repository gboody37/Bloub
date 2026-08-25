import sys
import re

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the pendingText state
code = re.sub(r'useState<\{x: number, y: number, text: string, color\?: string\} \| null>', r'useState<{x: number, y: number, text: string, color?: string, fontSize?: number, id?: number} | null>', code)

# Replace the text creation
code = re.sub(r'setPendingText\(\{ x, y, text: \'\', color: textColor \}\);', r'setPendingText({ x, y, text: \'\', color: textColor, fontSize: 24 });', code)

# Replace the pointerEvents in ann render
code = re.sub(r"pointerEvents:\s*pdfTool === 'eraser' \? 'auto' : 'none'", r"", code)

code = re.sub(r"className=\{`absolute font-bold bg-transparent px-2 py-1 whitespace-pre select-none \$\{pdfTool === 'eraser' \? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'\}`\}", r"className={`absolute font-bold bg-transparent px-2 py-1 whitespace-pre select-none ${(pdfTool === 'eraser' || pdfTool === 'cursor' || pdfTool === 'text') ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}", code)

# Replace the onMouseDown/onTouchStart for ann.type === 'text'
code = re.sub(
    r"(if \(ann.type === 'text'\) \{\s*return \(\s*<div\s*key=\{ann.id\}\s*onMouseDown=\{\(e\) => \{\s*)(if \(pdfTool === 'eraser'\) \{\s*e.stopPropagation\(\);\s*isDirtyRef.current = true;\s*setAnnotations\(p => \(\{ \.\.\.p, \[pageNumber\]: \(p\[pageNumber\] \|\| \[\]\)\.filter\(a => a\.id !== ann\.id\) \}\)\);\s*\})(\s*\}\})\s*onTouchStart=\{\(e\) => \{\s*(if \(pdfTool === 'eraser'\) \{\s*e.stopPropagation\(\);\s*isDirtyRef.current = true;\s*setAnnotations\(p => \(\{ \.\.\.p, \[pageNumber\]: \(p\[pageNumber\] \|\| \[\]\)\.filter\(a => a\.id !== ann\.id\) \}\)\);\s*\})(\s*\}\})",
    r"\1\2 else if (pdfTool === 'cursor' || pdfTool === 'text') { e.stopPropagation(); setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id }); setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); }\3 onTouchStart={(e) => { \4 else if (pdfTool === 'cursor' || pdfTool === 'text') { e.stopPropagation(); setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id }); setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); }\5",
    code
)

# Update fontSize of ann
code = re.sub(
    r"fontSize:\s*`\$\{Math\.max\(12, Math\.round\(24 \* zoomLevel\)\)\}px`,",
    r"fontSize: `${Math.max(12, Math.round((ann.fontSize || 24) * zoomLevel))}px`,",
    code
)

with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Regex updates applied")
