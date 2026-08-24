const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  'pt-12 pb-6 px-6 sticky top-0 z-30 flex justify-between',
  'pt-12 pb-6 px-6 relative z-30 flex justify-between'
);

fs.writeFileSync('src/app/page.tsx', code);
console.log('Fixed header!');
