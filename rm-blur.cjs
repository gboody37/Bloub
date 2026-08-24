const fs = require('fs');

function ripBlur(file) {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(/backdrop-blur-(sm|md|lg|xl|2xl|3xl)/g, '');
  code = code.replace(/backdrop-blur\b/g, '');
  fs.writeFileSync(file, code);
}

ripBlur('src/app/page.tsx');
ripBlur('src/components/study/NoteExplorer.tsx');
ripBlur('src/components/study/NoteViewer.tsx');
ripBlur('src/components/study/QuizSession.tsx');
