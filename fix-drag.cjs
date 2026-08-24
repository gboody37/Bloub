const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

const globalDrag = `
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rightEdge = rect.right;
      const newWidth = rightEdge - e.clientX;
      // Allow it to be as small as 200px or up to the container width minus 300px for PDF
      setNotesWidth(Math.max(200, Math.min(newWidth, Math.max(200, rect.width - 300))));
    };
    const handleGlobalMouseUp = () => setIsDragging(false);
    
    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);
`;

code = code.replace(/const handleParentMouseMove = [\s\S]*?setIsDragging\(false\);\n/, globalDrag);

code = code.replace(/onMouseMove=\{handleParentMouseMove\} onMouseUp=\{handleParentMouseUp\} onMouseLeave=\{handleParentMouseUp\}/, 'ref={containerRef}');

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Fixed drag');
