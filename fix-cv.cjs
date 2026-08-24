const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');
code = code.replace(
  '<span className={	ext-xs font-bold uppercase tracking-wider opacity-50}>Cloud Vault</span>',
  '<span className={	ext-xs font-bold uppercase tracking-wider opacity-50 }>Cloud Vault</span>'
);
fs.writeFileSync('src/app/page.tsx', code);
