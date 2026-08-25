const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// Update main layout
code = code.replace(/<main className=\{`w-full \$\{\(!isListView && activeTab === 'lists' && activeCatObj\?\.type === 'study'\) \? 'max-w-7xl px-2 sm:px-6' : \(activeTab === 'settings' \? 'max-w-5xl' : 'max-w-md'\)\} mx-auto min-h-screen flex flex-col relative transition-all duration-500`\}>/, 
`<main className={\`w-full \${viewingNote ? 'max-w-[100vw] px-0 md:px-4' : (!isListView && activeTab === 'lists' && activeCatObj?.type === 'study') ? 'max-w-[100vw] px-2 sm:px-6' : (activeTab === 'settings' ? 'max-w-5xl' : 'max-w-md')} mx-auto h-screen max-h-screen overflow-hidden flex flex-col relative transition-all duration-500\`}>`);

fs.writeFileSync('src/app/page.tsx', code);
console.log('Fixed page width');
