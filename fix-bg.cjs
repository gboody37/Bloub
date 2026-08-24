const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  /\{isDark && \(\n\s*<div className="fixed inset-0 pointer-events-none z-\[0\] opacity-60 mix-blend-screen overflow-hidden">\n\s*<div className="absolute top-\[-20%\].*?\/>\n\s*<div className="absolute bottom-\[-10%\].*?\/>\n\s*<div className="absolute top-\[30%\].*?\/>\n\s*<\/div>\n\s*\)}/s,
  ''
);

fs.writeFileSync('src/app/page.tsx', code);
console.log('Removed animated bg!');
