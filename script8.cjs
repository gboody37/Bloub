const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// Remove the Stats h2
code = code.replace(/<div className="flex justify-between items-center mb-6">\s*<h2 className=\{.*?\}>Stats<\/h2>\s*<\/div>/, '');

fs.writeFileSync('src/app/page.tsx', code);
