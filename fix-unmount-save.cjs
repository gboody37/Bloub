const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// Update handleSave to optionally take params to avoid closure staleness on unmount
code = code.replace(/const handleSave = async \(\) => \{/, "const handleSave = async (forceNotes?: any, forceAnnotations?: any) => {\n    const saveNotes = forceNotes || notes;\n    const saveAnnotations = forceAnnotations || annotations;");

// Update handleSave notesJson line
code = code.replace(/const notesJson = JSON\.stringify\(\{ notes, annotations \}\)\.replace\(\/'\/g, "''"\);/, "const notesJson = JSON.stringify({ notes: saveNotes, annotations: saveAnnotations }).replace(/'/g, \"''\");");

// Add refs and unmount save
const unmountSave = `
  const notesRef = useRef(notes);
  const annotationsRef = useRef(annotations);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    notesRef.current = notes;
    annotationsRef.current = annotations;
    isDirtyRef.current = true;
  }, [notes, annotations]);

  useEffect(() => {
    // Unmount save
    return () => {
      if (isDirtyRef.current) {
        handleSave(notesRef.current, annotationsRef.current);
      }
    };
  }, []);
`;
code = code.replace(/const currentNote = notes\[pageNumber\] \|\| \{ text: "", lang: "en" \};/, unmountSave + '\n  const currentNote = notes[pageNumber] || { text: "", lang: "en" };');

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Added unmount save');
