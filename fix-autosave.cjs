const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

const autosave = `
  useEffect(() => {
    // Only auto-save if there's actually something to save
    if (Object.keys(notes).length === 0 && Object.keys(annotations).length === 0) return;
    
    // Auto-save debounce
    const timer = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(timer);
  }, [notes, annotations]);
`;

code = code.replace(/const currentNote = notes\[pageNumber\] \|\| \{ text: '', lang: 'en' \};/, autosave + '\n  const currentNote = notes[pageNumber] || { text: "", lang: "en" };');

// Hide the save button since it's autosaving
code = code.replace(/<button\s+onClick=\{handleSave\}[\s\S]*?<\/button>/, '');

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Added auto-save');
