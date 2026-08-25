const fs = require("fs");
const path = require("path");

function getLuminance(hex) {
  const rgb = hex.replace("#", "").match(/.{2}/g).map(x => {
    const v = parseInt(x, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function getContrast(lum1, lum2) {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

const whiteLum = getLuminance("#ffffff");

const pagePath = path.resolve(__dirname, "../../src/app/page.tsx");
const page = fs.readFileSync(pagePath, "utf8");

const expectedThemes = [
  { name: 'Dark Blue', color: '#080d2a', id: 'bg-[#080d2a]' },
  { name: 'Midnight Violet', color: '#1a0b2e', id: 'bg-[#1a0b2e]' },
  { name: 'Emerald Night', color: '#022c22', id: 'bg-[#022c22]' },
  { name: 'Crimson Ember', color: '#3b0712', id: 'bg-[#3b0712]' },
  { name: 'Solar Amber', color: '#422006', id: 'bg-[#422006]' },
  { name: 'Abyssal Cyan', color: '#082f49', id: 'bg-[#082f49]' },
  { name: 'Neon Rose', color: '#380424', id: 'bg-[#380424]' },
  { name: 'Forest Moss', color: '#052e16', id: 'bg-[#052e16]' },
  { name: 'Royal Indigo', color: '#1e1b4b', id: 'bg-[#1e1b4b]' },
  { name: 'Deep Plum', color: '#2e0854', id: 'bg-[#2e0854]' },
  { name: 'Burnt Bronze', color: '#3c1605', id: 'bg-[#3c1605]' },
  { name: 'Titanium Slate', color: '#0f172a', id: 'bg-[#0f172a]' },
  { name: 'Obsidian OLED', color: '#030712', id: 'bg-[#030712]' },
  { name: 'Phantom Charcoal', color: '#18181b', id: 'bg-[#18181b]' },
  { name: 'Mystic Magenta', color: '#3b0d2d', id: 'bg-[#3b0d2d]' },
  { name: 'Arctic Navy', color: '#0c1a30', id: 'bg-[#0c1a30]' }
];

console.log("--- THEME VERIFICATION SUITE ---");

let pass = true;

expectedThemes.forEach((t, i) => {
  const present = page.includes(`id: '${t.id}', name: '${t.name}', color: '${t.color}'`);
  const lum = getLuminance(t.color);
  const contrast = getContrast(whiteLum, lum);
  const isDark = lum < 0.05;
  const isAAA = contrast >= 7.0;

  console.log(`[Theme ${i + 1}/16] ${t.name.padEnd(18)} | Hex: ${t.color} | Lum: ${lum.toFixed(4)} | Contrast: ${contrast.toFixed(2)}:1 | In page.tsx: ${present ? "OK" : "FAIL"}`);

  if (!present || !isDark || !isAAA) {
    pass = false;
  }
});

console.log("--------------------------------");
if (pass) {
  console.log("All 16 themes verified: Present in source, strictly dark, WCAG AAA compliant!");
} else {
  console.error("Theme verification failed!");
  process.exit(1);
}
