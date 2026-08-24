const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');
const replacement = fs.readFileSync('C:/Users/gbood/.gemini/antigravity/brain/9f2a3363-911a-4464-8f27-816c7776a25c/scratch/settings_block.tsx', 'utf-8');

const regex = /\{activeTab === 'settings' \? \([\s\S]*?\) : \(\s*\/\* Main Content Area \*\//m;
if (regex.test(code)) {
  code = code.replace(regex, replacement + "\n        ) : (\n          /* Main Content Area */");
  fs.writeFileSync('src/app/page.tsx', code);
  console.log('Successfully replaced Settings block');
} else {
  console.log('Regex failed');
}
