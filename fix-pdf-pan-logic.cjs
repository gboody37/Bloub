const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// Implement pan dragging on the scrollable wrapper
const searchTarget = `<div className="flex-1 overflow-auto bg-slate-900/50 flex justify-center p-8 relative hide-scrollbar">`;

if (code.includes(searchTarget)) {
  const replacement = `<div 
            className="flex-1 overflow-auto bg-slate-900/50 flex justify-center p-8 relative hide-scrollbar"
            onPointerDown={(e) => {
              if (pdfTool === 'pan') {
                e.preventDefault();
                const container = e.currentTarget;
                const startX = e.clientX;
                const startY = e.clientY;
                const startScrollLeft = container.scrollLeft;
                const startScrollTop = container.scrollTop;
                
                const handleMove = (ev) => {
                  container.scrollLeft = startScrollLeft - (ev.clientX - startX);
                  container.scrollTop = startScrollTop - (ev.clientY - startY);
                };
                const handleUp = () => {
                  window.removeEventListener('pointermove', handleMove);
                  window.removeEventListener('pointerup', handleUp);
                };
                window.addEventListener('pointermove', handleMove);
                window.addEventListener('pointerup', handleUp);
              }
            }}
            style={{ cursor: pdfTool === 'pan' ? 'grab' : 'default' }}
          >`;
  code = code.replace(searchTarget, replacement);
  fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
  console.log('Implemented pan logic');
} else {
  console.log('Could not find wrapper');
}
