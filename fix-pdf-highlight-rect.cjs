const fs = require('fs');
let code = fs.readFileSync('src/components/study/PdfNotebookViewer.tsx', 'utf-8');

// 1. Add highlight dragging states
code = code.replace(
  "const [pendingText, setPendingText] = useState<{x: number, y: number, text: string, color?: string, fontSize?: number, id?: number} | null>(null);",
  "const [pendingText, setPendingText] = useState<{x: number, y: number, text: string, color?: string, fontSize?: number, id?: number} | null>(null);\n  const [highlightStart, setHighlightStart] = useState<{x: number, y: number} | null>(null);\n  const [highlightCurrent, setHighlightCurrent] = useState<{x: number, y: number} | null>(null);"
);

// 2. Render the temporary highlight while dragging
const pageRenderTarget = `<Page 
                  pageNumber={pageNumber}`;
const tempHighlightRender = `
                {highlightStart && highlightCurrent && (
                  <div 
                    className="absolute mix-blend-multiply z-30 pointer-events-none"
                    style={{
                      backgroundColor: highlightColor || '#facc1580',
                      left: Math.min(highlightStart.x, highlightCurrent.x) * zoomLevel,
                      top: Math.min(highlightStart.y, highlightCurrent.y) * zoomLevel,
                      width: Math.abs(highlightCurrent.x - highlightStart.x) * zoomLevel,
                      height: Math.abs(highlightCurrent.y - highlightStart.y) * zoomLevel
                    }}
                  />
                )}
                `;
code = code.replace(pageRenderTarget, tempHighlightRender + pageRenderTarget);

// 3. Add Pointer handlers to the overlay container
// We need to replace onMouseUp and onTouchEnd with generic pointer handlers
code = code.replace(
  `onMouseUp={handleContainerMouseUp} onTouchEnd={(e) => { e.preventDefault(); handleContainerMouseUp(e as any); }}`,
  `onPointerDown={(e) => {
                  if (pdfTool === 'highlight') {
                    e.preventDefault();
                    const coords = getEventClientCoords(e);
                    if (!coords) return;
                    const containerRect = e.currentTarget.getBoundingClientRect();
                    const x = (coords.clientX - containerRect.left) / zoomLevel;
                    const y = (coords.clientY - containerRect.top) / zoomLevel;
                    setHighlightStart({ x, y });
                    setHighlightCurrent({ x, y });
                  }
                }}
                onPointerMove={(e) => {
                  if (pdfTool === 'highlight' && highlightStart) {
                    const coords = getEventClientCoords(e);
                    if (!coords) return;
                    const containerRect = e.currentTarget.getBoundingClientRect();
                    const x = (coords.clientX - containerRect.left) / zoomLevel;
                    const y = (coords.clientY - containerRect.top) / zoomLevel;
                    setHighlightCurrent({ x, y });
                  }
                }}
                onPointerUp={(e) => {
                  if (pdfTool === 'highlight' && highlightStart && highlightCurrent) {
                    const newAnn = {
                      id: Date.now(),
                      type: 'highlight',
                      startX: Math.min(highlightStart.x, highlightCurrent.x),
                      startY: Math.min(highlightStart.y, highlightCurrent.y),
                      w: Math.abs(highlightCurrent.x - highlightStart.x),
                      h: Math.abs(highlightCurrent.y - highlightStart.y),
                      color: highlightColor
                    };
                    isDirtyRef.current = true;
                    setAnnotations(prev => ({
                      ...prev,
                      [pageNumber]: [...(prev[pageNumber] || []), newAnn]
                    }));
                    setHighlightStart(null);
                    setHighlightCurrent(null);
                  } else {
                    handleContainerMouseUp(e as any);
                  }
                }}
                onPointerLeave={() => {
                  if (highlightStart) {
                    setHighlightStart(null);
                    setHighlightCurrent(null);
                  }
                }}`
);

// 4. Remove the old getSelection logic from handleContainerMouseUp
code = code.replace(
  /if \(pdfTool === 'highlight'\) \{[\s\S]*?isDirtyRef\.current = true;[\s\S]*?\}\s*\}/,
  `if (pdfTool === 'highlight') {
        // Now handled by pointer events
      }`
);

fs.writeFileSync('src/components/study/PdfNotebookViewer.tsx', code);
console.log('Replaced selection highlight with rectangle drawing highlight');
