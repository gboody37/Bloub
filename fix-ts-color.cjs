const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

code = code.replace(/const \[pendingText, setPendingText\] = useState<\{x: number, y: number, text: string\} \| null>\(null\);/, 
  "const [pendingText, setPendingText] = useState<{x: number, y: number, text: string, color?: string} | null>(null);");

code = code.replace(/import \{ useState, useEffect \} from 'react';/, "import { useState, useEffect, useRef } from 'react';");

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed TS errors');
