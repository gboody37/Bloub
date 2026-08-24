const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

const newLogic = `      let content = currentNote.content;
      // Replace or inject pdf_notes in frontmatter
      const notesJson = JSON.stringify(notes).replace(/'/g, "''"); // SQL/YAML safe single quote escape
      
      if (content.includes('pdf_notes:')) {
        content = content.replace(/pdf_notes:\\s*'.*?'/g, \`pdf_notes: '\${notesJson}'\`);
      } else if (content.startsWith('---')) {
        content = content.replace(/^---\\r?\\n/, \`---\\npdf_notes: '\${notesJson}'\\n\`);
      } else {
        content = \`---\\npdf_notes: '\${notesJson}'\\n---\\n\\n\` + content;
      }`;

code = code.replace(/let content = currentNote\.content;[\s\S]*?content = content\.replace\(\/\(pdf_url:\.\*\?\)\\n\/, `\$1\\npdf_notes: '\$\{notesJson\}'\\n`\);\s*\}/, newLogic);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed handleSave');
