const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');
code = code.replace(/viewingNote \? 'max-w-\[100vw\] px-0 md:px-4'/, "selectedNote ? 'max-w-[100vw] px-0 md:px-4'");
fs.writeFileSync('src/app/page.tsx', code);
console.log('Fixed variable name');
