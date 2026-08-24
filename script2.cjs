const fs = require('fs');
let code = fs.readFileSync('src/components/BloubMascot.tsx', 'utf-8');
code = code.replace(/isStatic = false,\n\}: Props\) \{\n  expression = 'neutre',\n  onInteract,\n\}: Props\) \{/, 'isStatic = false,\n}: Props) {');
fs.writeFileSync('src/components/BloubMascot.tsx', code);
