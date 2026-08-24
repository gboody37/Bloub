const fs = require('fs');
let code = fs.readFileSync('src/app/globals.css', 'utf-8');
code = code.replace(/-webkit-\/\* Removed for FPS \*\//g, '/* Removed for FPS */');
fs.writeFileSync('src/app/globals.css', code);
