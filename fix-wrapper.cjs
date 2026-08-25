const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(/<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">\n\s*<NoteViewer/m, 
  "<div className=\"animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full flex flex-col\">\n                      <NoteViewer");

fs.writeFileSync('src/app/page.tsx', code);
console.log('Fixed wrapper flex');
