const fs = require('fs');
let code = fs.readFileSync('src/app/globals.css', 'utf-8');
code = code.replace(/background-image:\s*url\("data:image\/svg\+xml,.*?noiseFilter.*?"\);/g, '');
code = code.replace(/backdrop-filter:\s*blur\(\d+px\);/g, '/* Removed for FPS */');
code = code.replace(/-webkit-backdrop-filter:\s*blur\(\d+px\);/g, '/* Removed for FPS */');
code = code.replace(/filter:\s*blur\(48px\);/g, 'filter: blur(24px);');
fs.writeFileSync('src/app/globals.css', code);
