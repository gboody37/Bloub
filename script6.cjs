const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(/expression="heureux" shape=\{targetShape\}/, 'expression={mascotExpression} shape={targetShape}');

fs.writeFileSync('src/app/page.tsx', code);
