const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  /<main className=\{\w-full \$\{\(\!isListView && activeTab === 'lists' && activeCatObj\?\.type === 'study'\) \? 'max-w-7xl px-2 sm:px-6' : 'max-w-md'\} mx-auto min-h-screen flex flex-col relative transition-all duration-500\\}>/,
  \<main className={\\\w-full \ mx-auto min-h-[100dvh] h-screen flex flex-col relative transition-all duration-500\\\}>\
);

fs.writeFileSync('src/app/page.tsx', code);
console.log('Fixed width');
