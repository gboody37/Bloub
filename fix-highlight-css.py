import sys

with open('src/components/study/PdfNotebookViewer.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Fix the opacity issue by removing mix-blend-multiply and adding '80' for 50% opacity
render_target = """className={`absolute mix-blend-multiply ${pdfTool === 'eraser' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`} 
                          style={{ backgroundColor: ann.color || '#facc1580', left, top, width: w, height: h }}"""
render_replace = """className={`absolute ${pdfTool === 'eraser' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`} 
                          style={{ backgroundColor: (ann.color && ann.color.length === 7) ? ann.color + '80' : (ann.color || '#facc1580'), left, top, width: w, height: h }}"""

if render_target in code:
    code = code.replace(render_target, render_replace)
    print("Fixed opacity")
else:
    print("Failed to fix opacity")

# 2. Add global CSS to fix react-pdf text layer misalignment
css_target = """  return (
    <div ref={containerRef}"""
css_replace = """  return (
    <div ref={containerRef} className={`flex w-full flex-1 h-full min-h-[500px] border rounded-2xl overflow-hidden shadow-inner ${isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-gray-100'}`}>
      <style>{`
        .react-pdf__Page__textContent {
          line-height: 1 !important;
        }
        .react-pdf__Page__textContent > span {
          line-height: 1 !important;
        }
      `}</style>"""

if css_target in code:
    # wait, the target has more than just the first line
    pass

# We can just insert the style block after the first div
style_target = """  return (
    <div ref={containerRef} className={`flex w-full flex-1 h-full min-h-[500px] border rounded-2xl overflow-hidden shadow-inner ${isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-gray-100'}`}>"""
style_replace = """  return (
    <div ref={containerRef} className={`flex w-full flex-1 h-full min-h-[500px] border rounded-2xl overflow-hidden shadow-inner ${isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-gray-100'}`}>
      <style>{`
        .react-pdf__Page__textContent {
          line-height: 1 !important;
        }
        .react-pdf__Page__textContent > span {
          line-height: 1 !important;
        }
      `}</style>"""

if style_target in code:
    code = code.replace(style_target, style_replace)
    print("Fixed css")
else:
    print("Failed to fix css")

with open('src/components/study/PdfNotebookViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
