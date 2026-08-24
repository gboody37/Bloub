const fs = require('fs');

let code = fs.readFileSync('src/app/page.tsx', 'utf-8');
const settingsStartIndex = code.indexOf("{activeTab === 'settings' ? (");
const settingsEndIndex = code.indexOf(") : (\n        /* Main Content Area */");

if (settingsStartIndex === -1 || settingsEndIndex === -1) {
  console.log("Could not find bounds");
  process.exit(1);
}

// I will read the replacement from another file to avoid powershell parsing
