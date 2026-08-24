const fs = require('fs');
let code = fs.readFileSync('src/components/study/NoteViewer.tsx', 'utf-8');

// The parent is: <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
// We need to add flex flex-col to it so its children can use h-full properly
code = code.replace(/className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar"/, 'className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar flex flex-col"');

fs.writeFileSync('src/components/study/NoteViewer.tsx', code);
console.log('Fixed noteviewer layout');
