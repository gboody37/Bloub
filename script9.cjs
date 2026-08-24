const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  /const activeTheme = THEMES\.find\(t => t\.id === bgTheme\);\n      const themeColor = activeTheme \? activeTheme\.color : '#0f172a';/,
  \const activeTheme = THEMES.find(t => t.id === bgTheme);
      const themeColor = activeTheme ? activeTheme.color : '#0f172a';
      if (bgTheme !== 'minimal') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', bgTheme);
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.removeAttribute('data-theme');
      }\
);

fs.writeFileSync('src/app/page.tsx', code);
