const fs = require('fs');
let code = fs.readFileSync('src/components/study/NoteViewer.tsx', 'utf-8');

code = code.replace(
  /\{isEditing \? \(\n\s*<textarea[\s\S]*?\/>\n\s*\) : \(\n\s*renderMarkdownContent\(editContent\)\n\s*\)\}/,
  \{isEditing ? (
              <textarea
                dir="auto"
                className={\\\w-full min-h-[500px] h-full resize-none bg-transparent outline-none p-4 rounded-2xl border \\\\}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Start typing markdown..."
                spellCheck={false}
              />
            ) : note.frontmatter?.pdf_url ? (
              <div className="flex flex-col w-full h-full space-y-4">
                <iframe
                  src={note.frontmatter.pdf_url}
                  className={\\\w-full h-[75vh] rounded-2xl shadow-sm border \\\\}
                  title="PDF Viewer"
                />
                <details className={\\\p-4 rounded-xl border transition-all \\\\}>
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider select-none">Show Extracted Text (For AI Quizzes)</summary>
                  <div className="mt-4 opacity-80 text-sm">
                    {renderMarkdownContent(editContent)}
                  </div>
                </details>
              </div>
            ) : (
              renderMarkdownContent(editContent)
            )}\
);

fs.writeFileSync('src/components/study/NoteViewer.tsx', code);
