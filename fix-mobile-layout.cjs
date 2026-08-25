const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(/mx-auto h-screen max-h-screen overflow-hidden flex flex-col relative transition-all duration-500`\}>/, 
  "mx-auto ${selectedNote ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-[100dvh] pb-24'} flex flex-col relative transition-all duration-500`}>");

fs.writeFileSync('src/app/page.tsx', code);
console.log('Fixed mobile layout height constraints');
