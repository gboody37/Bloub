const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Remove the settings button from header
code = code.replace(
  /<button onClick=\{\(\) => setShowSettings\(true\)\} className=\{\p-2\.5 rounded-full transition-all active:scale-95 shadow-sm backdrop-blur-md \$\{isDark \? 'bg-slate-800\/60 text-slate-300 hover:bg-slate-700 hover:text-white' : 'bg-white\/60 text-gray-400 hover:text-gray-700 hover:bg-white'\}\\}>\s*<Settings size=\{20\} \/>\s*<\/button>/,
  ''
);

// 2. Remove the fixed side panel and make it render in the activeTab ternary
const settingsRegex = /\{\/\* Settings Side Panel \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
const match = code.match(settingsRegex);
if (match) {
  let settingsCode = match[0];
  code = code.replace(settingsRegex, '');

  // Modify settingsCode to fit as a tab view
  settingsCode = settingsCode.replace(/<div className=\{\ixed inset-y-0 right-0 z-50 flex transform transition-transform duration-500 ease-out \$\{showSettings \? 'translate-x-0' : 'translate-x-full'\}\\}>/, '');
  settingsCode = settingsCode.replace(/\{showSettings && \([\s\S]*?\}\)/, '');
  settingsCode = settingsCode.replace(/<div className=\{\w-full max-w-md h-full shadow-2xl overflow-y-auto custom-scrollbar flex flex-col border-l \$\{isDark \? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'\}\\}>/, '<div className={w-full max-w-md mx-auto py-8 animate-in fade-in zoom-in-95 duration-300}>');
  settingsCode = settingsCode.replace(/<button onClick=\{\(\) => setShowSettings\(false\)\}.*?><X size=\{18\}\/><\/button>/, '');
  settingsCode = settingsCode.replace(/setShowSettings\(false\);/g, ''); // remove from logout
  // remove trailing closing divs
  settingsCode = settingsCode.trim();
  settingsCode = settingsCode.substring(0, settingsCode.lastIndexOf('</div>'));
  settingsCode = settingsCode.substring(0, settingsCode.lastIndexOf('</div>'));

  // Insert it in the ternary
  const statsRegex = /(activeTab === 'stats' \? \([\s\S]*?<\/div>\s*\))/;
  code = code.replace(statsRegex, $1 : activeTab === 'settings' ? (\n  \n));
}

fs.writeFileSync('src/app/page.tsx', code);
