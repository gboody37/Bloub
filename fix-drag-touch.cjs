const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// Global touch events for resizer
const globalDragTouch = `
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rightEdge = rect.right;
      let clientX = 0;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
      } else {
        clientX = e.clientX;
      }
      const newWidth = rightEdge - clientX;
      setNotesWidth(Math.max(200, Math.min(newWidth, Math.max(200, rect.width - 300))));
    };
    const handleGlobalMouseUp = () => setIsDragging(false);
    
    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalMouseMove, { passive: false });
      window.addEventListener('touchend', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalMouseMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging]);
`;

code = code.replace(/const containerRef = React\.useRef<HTMLDivElement>\(null\);[\s\S]*?\}, \[isDragging\]\);/, globalDragTouch);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Added global touch events');
