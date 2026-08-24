const fs = require('fs');
let code = fs.readFileSync('src/app/globals.css', 'utf-8');

// 1. Remove the SVG noise filter from body
code = code.replace(/background-image:\s*url\("data:image\/svg\+xml,.*?noiseFilter.*?"\);/g, '');

// 2. Reduce the heavy blur filters to lighter, less GPU-intensive shadows
code = code.replace(/backdrop-filter:\s*blur\(\d+px\);/g, '/* Removed for FPS */');
code = code.replace(/-webkit-backdrop-filter:\s*blur\(\d+px\);/g, '/* Removed for FPS */');
code = code.replace(/filter:\s*blur\(\d+px\);/g, 'filter: blur(24px);');

fs.writeFileSync('src/app/globals.css', code);
