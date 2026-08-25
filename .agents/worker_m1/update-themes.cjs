const fs = require("fs");
const path = require("path");

const newThemesBlock = `export const THEMES = [
  { id: 'bg-[#080d2a]', name: 'Dark Blue', color: '#080d2a' },
  { id: 'bg-[#1a0b2e]', name: 'Midnight Violet', color: '#1a0b2e' },
  { id: 'bg-[#022c22]', name: 'Emerald Night', color: '#022c22' },
  { id: 'bg-[#3b0712]', name: 'Crimson Ember', color: '#3b0712' },
  { id: 'bg-[#422006]', name: 'Solar Amber', color: '#422006' },
  { id: 'bg-[#082f49]', name: 'Abyssal Cyan', color: '#082f49' },
  { id: 'bg-[#380424]', name: 'Neon Rose', color: '#380424' },
  { id: 'bg-[#052e16]', name: 'Forest Moss', color: '#052e16' },
  { id: 'bg-[#1e1b4b]', name: 'Royal Indigo', color: '#1e1b4b' },
  { id: 'bg-[#2e0854]', name: 'Deep Plum', color: '#2e0854' },
  { id: 'bg-[#3c1605]', name: 'Burnt Bronze', color: '#3c1605' },
  { id: 'bg-[#0f172a]', name: 'Titanium Slate', color: '#0f172a' },
  { id: 'bg-[#030712]', name: 'Obsidian OLED', color: '#030712' },
  { id: 'bg-[#18181b]', name: 'Phantom Charcoal', color: '#18181b' },
  { id: 'bg-[#3b0d2d]', name: 'Mystic Magenta', color: '#3b0d2d' },
  { id: 'bg-[#0c1a30]', name: 'Arctic Navy', color: '#0c1a30' }
];`;

const pagePath = path.resolve(__dirname, "../../src/app/page.tsx");
let page = fs.readFileSync(pagePath, "utf8");

const startIdx = page.indexOf("const THEMES = [");
if (startIdx !== -1) {
  const endIdx = page.indexOf("];", startIdx) + 2;
  page = page.slice(0, startIdx) + newThemesBlock + page.slice(endIdx);
  fs.writeFileSync(pagePath, page, "utf8");
  console.log("Updated THEMES in page.tsx successfully");
} else {
  console.error("Could not find startIdx for THEMES in page.tsx");
}
