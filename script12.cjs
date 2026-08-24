const fs = require('fs');
let code = fs.readFileSync('src/components/study/NoteViewer.tsx', 'utf-8');

code = code.replace(
  /className="flex-1 w-full bg-transparent resize-none outline-none text-sm leading-relaxed custom-scrollbar"\n        <div className="flex-1 overflow-y-auto custom-scrollbar"/,
  \className="flex-1 w-full bg-transparent resize-none outline-none text-sm leading-relaxed custom-scrollbar"
            />
          </div>
        )}

        {/* Rendered Markdown Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar"\
);

fs.writeFileSync('src/components/study/NoteViewer.tsx', code);
