const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

const newThemes = `const THEMES = [
  { id: 'bg-[#0f172a]', name: 'Classic Dark Blue', color: '#0f172a' },
  { id: 'bg-[#1e1e2e]', name: 'Mocha', color: '#1e1e2e' },
  { id: 'bg-[#2a0a18]', name: 'Deep Crimson', color: '#2a0a18' },
  { id: 'bg-[#0a2a1a]', name: 'Emerald Shadow', color: '#0a2a1a' },
  { id: 'bg-[#1a0a2a]', name: 'Neon Purple', color: '#1a0a2a' },
  { id: 'bg-[#0a1a2a]', name: 'Midnight Cyan', color: '#0a1a2a' },
  { id: 'bg-[#2a1a0a]', name: 'Gold Obsidian', color: '#2a1a0a' },
  { id: 'bg-[#2a0a2a]', name: 'Sunset Velvet', color: '#2a0a2a' },
  { id: 'bg-[#090514]', name: 'Cyberpunk Neon', color: '#090514' },
  { id: 'bg-[#282a36]', name: 'Dracula', color: '#282a36' },
  { id: 'bg-[#111111]', name: 'Pitch Black', color: '#111111' },
  { id: 'bg-[#1e1525]', name: 'Sakura Night', color: '#1e1525' }
];`;

const regex = /const THEMES = \[\s*\{ id: 'bg-\[#1e1e2e\]'[\s\S]*?\];/;
code = code.replace(regex, newThemes);

fs.writeFileSync('src/app/page.tsx', code);
console.log("Updated themes");
