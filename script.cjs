const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

const settingsRegex = /\{\/\* Settings Side Panel \*\/\}[\s\S]*?(?=\{\/\* Add Task Modal \*\/)/;
const match = code.match(settingsRegex);
if(match) {
  let settingsCode = match[0];
  code = code.replace(settingsRegex, '');

  settingsCode = settingsCode.replace(/<div className=\{\ixed inset-y-0 right-0 z-50 flex transform transition-transform duration-500 ease-out \$\{showSettings \? 'translate-x-0' : 'translate-x-full'\}\\}>/, '');
  settingsCode = settingsCode.replace(/\{showSettings && \([\s\S]*?\}\)/, '');
  settingsCode = settingsCode.replace(/<div className=\{\w-full max-w-md h-full shadow-2xl overflow-y-auto custom-scrollbar flex flex-col border-l \$\{isDark \? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'\}\\}>/, '<div className={w-full max-w-md mx-auto py-8 animate-in fade-in zoom-in-95 duration-300 pb-32}>');
  settingsCode = settingsCode.replace(/<button onClick=\{\(\) => setShowSettings\(false\)\}.*?><X size=\{18\}\/><\/button>/, '');
  settingsCode = settingsCode.replace(/setShowSettings\(false\);/g, '');
  
  settingsCode = settingsCode.trim();
  settingsCode = settingsCode.substring(0, settingsCode.lastIndexOf('</div>'));
  settingsCode = settingsCode.substring(0, settingsCode.lastIndexOf('</div>'));

  const statsRegex = /(activeTab === 'stats' \? \([\s\S]*?<\/div>\s*\)) : \(/;
  code = code.replace(statsRegex, "\ : activeTab === 'settings' ? (\n" + settingsCode + "\n) : (");
}

fs.writeFileSync('src/app/page.tsx', code);
