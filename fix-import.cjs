const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

code = code.replace(/import React, \{ useState, useEffect \} from 'react';/, "import React, { useState, useEffect, useRef } from 'react';");

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed import');
