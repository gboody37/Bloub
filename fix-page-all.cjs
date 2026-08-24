const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Expand settings width
code = code.replace(
  /className=\{\`w-full \$\{\(\!isListView && activeTab === 'lists' && activeCatObj\?\.type === 'study'\) \? 'max-w-7xl px-2 sm:px-6' : 'max-w-md'\} mx-auto min-h-screen flex flex-col relative transition-all duration-500\`\}/,
  'className={`w-full ${(!isListView && activeTab === \'lists\' && activeCatObj?.type === \'study\') ? \'max-w-7xl px-2 sm:px-6\' : (activeTab === \'settings\' ? \'max-w-5xl\' : \'max-w-md\')} mx-auto min-h-screen flex flex-col relative transition-all duration-500`}'
);

// 2. Add mesh blobs to page.tsx
code = code.replace(
  /<div className=\{\`min-h-screen w-full \$\{bgTheme\} transition-colors duration-500 font-sans\`\}>/,
  `<div className={\`min-h-screen w-full \${bgTheme} transition-colors duration-500 font-sans\`}>
      {isDark && (
        <div className="fixed inset-0 pointer-events-none z-[0] opacity-60 mix-blend-screen overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/40 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/30 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute top-[30%] left-[50%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[100px]" />
        </div>
      )}`
);

// 3. Fix Today tab conditional fallthrough
code = code.replace(
  /\} : activeTab === 'lists' && !isListView \? \(/g,
  '} : (activeTab === \'lists\' && !isListView) || activeTab === \'today\' ? ('
);

// 4. Fix Cloud Vault text color
code = code.replace(
  /<span className=\{\`text-xs font-bold uppercase tracking-wider opacity-50\`\}>Cloud Vault<\/span>/g,
  '<span className={`text-xs font-bold uppercase tracking-wider opacity-50 ${isDark ? \'text-slate-400\' : \'text-gray-500\'}`}>Cloud Vault</span>'
);

// 5. Float settings window on desktop
code = code.replace(
  /<div className="w-full h-full flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-300">/g,
  '<div className="flex-1 w-full flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-300 md:shadow-2xl md:my-6 md:rounded-3xl md:border md:border-white/10">'
).replace(
  /<div className="hidden md:flex md:w-1\/2 lg:w-3\/5 h-full items-center justify-center bg-slate-900\/40 relative">/g,
  '<div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-1 items-center justify-center bg-slate-900/40 relative">'
);

fs.writeFileSync('src/app/page.tsx', code);
console.log('All page.tsx fixes applied via script!');
