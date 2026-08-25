'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, PenTool, Save, Check, Highlighter, Type, MousePointer2, ZoomIn, ZoomOut, Eraser, Undo2, Sidebar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfNotebookViewerProps {
  pdfUrl: string;
  noteId: string;
  initialNotesStr?: string;
  isDark?: boolean;
}

export default function PdfNotebookViewer({ pdfUrl, noteId, initialNotesStr, isDark = true }: PdfNotebookViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [notes, setNotes] = useState<Record<number, { text: string, lang: 'en' | 'ar' }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pdfTool, setPdfTool] = useState('cursor');
    const [textColor, setTextColor] = useState('#9333ea'); // default purple-600
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [notesWidth, setNotesWidth] = useState(450);
  const [isDragging, setIsDragging] = useState(false);
    const [showNotes, setShowNotes] = useState(true);
    const [pendingText, setPendingText] = useState<{x: number, y: number, text: string, color?: string} | null>(null);
  
  
  // Annotation State
  const [annotations, setAnnotations] = useState<Record<number, any[]>>({});
  const overlayRef = React.useRef<HTMLDivElement>(null);
  
  
  const handleUndo = () => {
    setAnnotations(prev => {
      const pageAnns = prev[pageNumber] || [];
      if (pageAnns.length === 0) return prev;
      return {
        ...prev,
        [pageNumber]: pageAnns.slice(0, -1)
      };
    });
  };

  const handleContainerMouseUp = (e: React.MouseEvent) => {
    if (!overlayRef.current) return;
    const containerRect = overlayRef.current.getBoundingClientRect();
    
    
    if (pdfTool === 'text') {
      if (pendingText) return; // Don't create a new box if they are just clicking to blur the current one

      const x = (e.clientX - containerRect.left) / zoomLevel;
      const y = (e.clientY - containerRect.top) / zoomLevel;
      setPendingText({ x, y, text: '', color: textColor });
      return;
    }

    
    if (pdfTool === 'highlight') {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const rects = Array.from(range.getClientRects());
        
        const newHighlights = rects.map((rect, i) => ({
          id: Date.now() + i,
          type: 'highlight',
          startX: (rect.left - containerRect.left) / zoomLevel,
          startY: (rect.top - containerRect.top) / zoomLevel,
          w: rect.width / zoomLevel,
          h: rect.height / zoomLevel
        }));

        setAnnotations(prev => ({
          ...prev,
          [pageNumber]: [...(prev[pageNumber] || []), ...newHighlights]
        }));
        
        selection.removeAllRanges();
      }
    }
  };


  
  
  
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


  const supabase = createClient();

  useEffect(() => {
    if (initialNotesStr) {
      try {
        const parsed = JSON.parse(initialNotesStr);
        if (parsed.notes) {
          setNotes(parsed.notes);
          setAnnotations(parsed.annotations || {});
        } else {
          setNotes(parsed);
        }
      } catch (e) {
        console.error("Failed to parse initial pdf notes", e);
      }
    }
  }, [initialNotesStr]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const handleSave = async (forceNotes?: any, forceAnnotations?: any) => {
    const saveNotes = forceNotes || notes;
    const saveAnnotations = forceAnnotations || annotations;
    setIsSaving(true);
    try {
      // We fetch the latest frontmatter to not overwrite other things
      const { data: currentNote } = await supabase.from('vault_notes').select('content').eq('id', noteId).single();
      if (!currentNote) return;

            let content = currentNote.content;
      // Replace or inject pdf_notes in frontmatter
      const notesJson = JSON.stringify({ notes: saveNotes, annotations: saveAnnotations }).replace(/'/g, "''"); // SQL/YAML safe single quote escape
      
      if (content.includes('pdf_notes:')) {
        content = content.replace(/pdf_notes:\s*'.*?'/g, `pdf_notes: '${notesJson}'`);
      } else if (content.startsWith('---')) {
        content = content.replace(/^---\r?\n/, `---\npdf_notes: '${notesJson}'\n`);
      } else {
        content = `---\npdf_notes: '${notesJson}'\n---\n\n` + content;
      }

      await supabase.from('vault_notes').update({ content }).eq('id', noteId);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
      alert('Failed to save notebook');
    } finally {
      setIsSaving(false);
    }
  };

  
  useEffect(() => {
    // Only auto-save if there's actually something to save
    if (Object.keys(notes).length === 0 && Object.keys(annotations).length === 0) return;
    
    // Auto-save debounce
    const timer = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(timer);
  }, [notes, annotations]);

  
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

  const currentNote = notes[pageNumber] || { text: "", lang: "en" };

  return (
    <div className={`flex w-full h-[650px] border rounded-2xl overflow-hidden shadow-inner ${isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-gray-100'}`}>
       
       {/* PDF Viewer Side */}
       <div className="flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20">
                  {/* PDF Toolbar */}
         <div className="sticky top-2 mb-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl z-50">
           <button onClick={() => setPdfTool('cursor')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'cursor' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}><MousePointer2 size={16}/></button>
           <button onClick={() => setPdfTool('highlight')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'highlight' ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`}><Highlighter size={16}/></button>
           
             <button onClick={() => setPdfTool('text')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'text' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-purple-400'}`}><Type size={16}/></button>
             {pdfTool === 'text' && (
               <div className="flex items-center gap-1 mx-1 bg-slate-800 rounded-lg p-1">
                 {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#9333ea', '#ec4899', '#ffffff', '#000000'].map(c => (
                   <button key={c} onClick={() => setTextColor(c)} className={`w-4 h-4 rounded-full border ${textColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />
                 ))}
               </div>
             )}


           <button onClick={() => setPdfTool('eraser')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'eraser' ? 'bg-pink-500/20 text-pink-400' : 'text-slate-400 hover:text-pink-400'}`}><Eraser size={16}/></button>
           <button onClick={handleUndo} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white"><Undo2 size={16}/></button>

           <div className="w-px h-6 bg-slate-700/50 mx-1"></div>
           <button onClick={() => setShowNotes(!showNotes)} className={`p-1.5 rounded-lg transition-colors ${showNotes ? 'text-blue-400 bg-blue-500/20' : 'text-slate-400 hover:text-white'}`} title="Toggle Notes Panel"><Sidebar size={16}/></button>

           <div className="w-px h-4 bg-slate-700 mx-1"></div>
           <button onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white">
             <ZoomOut size={16}/>
           </button>
           <div className="text-xs font-mono text-slate-400 font-bold min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</div>
           <button onClick={() => setZoomLevel(z => Math.min(z + 0.25, 3.0))} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white">
             <ZoomIn size={16}/>
           </button>
         </div>

         <Document 
            file={pdfUrl} 
            onLoadSuccess={onDocumentLoadSuccess} 
            loading={<div className="text-slate-400 font-mono text-sm animate-pulse flex h-full items-center">Loading Document...</div>}
            className="drop-shadow-2xl"
         >
           
           
           <div className="relative inline-block shadow-2xl" ref={overlayRef} onMouseUp={handleContainerMouseUp} onTouchEnd={(e) => { e.preventDefault(); handleContainerMouseUp(e as any); }} style={{ cursor: pdfTool === 'text' ? 'text' : pdfTool === 'highlight' ? 'text' : pdfTool === 'eraser' ? 'crosshair' : 'default' }}>
             <div className="absolute inset-0 z-20" style={{ pointerEvents: pdfTool === "eraser" ? "auto" : "none" }}>
               {(annotations[pageNumber] || []).map(ann => {
                 if (ann.type === 'highlight') {
                   const w = Math.abs(ann.w) * zoomLevel;
                   const h = Math.abs(ann.h) * zoomLevel;
                   const left = ann.startX * zoomLevel;
                   const top = ann.startY * zoomLevel;
                   return <div key={ann.id} onMouseDown={(e) => { if(pdfTool==='eraser') { e.stopPropagation(); setAnnotations(p => ({...p, [pageNumber]: p[pageNumber].filter(a => a.id !== ann.id)})); } }} onTouchStart={(e) => { if(pdfTool==='eraser') { e.stopPropagation(); setAnnotations(p => ({...p, [pageNumber]: p[pageNumber].filter(a => a.id !== ann.id)})); } }} className="absolute font-bold text-3xl bg-transparent px-2 py-1 whitespace-pre pointer-events-auto" style={{ left: ann.x * zoomLevel, top: ann.y * zoomLevel, fontFamily: ann.text.match(/[\u0600-\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)', color: ann.color || '#9333ea' }} dir="auto">{ann.text}</div>;
                 }
                 return null;
                 })}

                 
                 {pendingText && (
                   <input
                     autoFocus
                     type="text"
                     dir="auto"
                     value={pendingText.text}
                     onChange={(e) => setPendingText({ ...pendingText, text: e.target.value })}
                     onBlur={() => {
                       if (pendingText.text.trim()) {
                         setAnnotations(prev => ({
                           ...prev,
                           [pageNumber]: [...(prev[pageNumber] || []), { id: Date.now(), type: 'text', ...pendingText }]
                         }));
                       }
                       setPendingText(null);
                       setPdfTool('cursor');
                     }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.currentTarget.blur();
                       }
                       if (e.key === 'Escape') {
                         setPendingText(null);
                         setPdfTool('cursor');
                       }
                     }}
                     className="absolute font-bold text-3xl bg-transparent px-2 py-1 border-2 border-dashed border-purple-500/50 outline-none pointer-events-auto min-w-[200px]"
                     style={{ 
                       left: pendingText.x * zoomLevel, 
                       top: pendingText.y * zoomLevel,
                       fontFamily: pendingText.text.match(/[\u0600-\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)'
                     }}
                   />
                 )}
               </div>
               <Page 
               pageNumber={pageNumber} 
               renderTextLayer={true} 
               renderAnnotationLayer={true} 
               scale={zoomLevel} 
               className="rounded-lg overflow-hidden shadow-2xl transition-transform duration-300 transform-gpu"
             />
           </div>
  
         </Document>
         
         {numPages && (
           <div className="sticky bottom-6 mt-6 flex items-center gap-4 bg-slate-900/90 backdrop-blur px-6 py-3 rounded-full border border-slate-700 shadow-2xl z-50">
               <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="p-1.5 text-white disabled:opacity-30 hover:bg-slate-800 rounded-full transition-colors"><ChevronLeft size={20}/></button>
               
               <div className="flex items-center gap-2 text-white text-xs tracking-widest font-bold uppercase">
                 <span>Page</span>
                 <input 
                   type="number" 
                   min={1} 
                   max={numPages || 1} 
                   value={pageNumber} 
                   onChange={(e) => {
                     const val = parseInt(e.target.value);
                     if (!isNaN(val)) setPageNumber(Math.min(Math.max(1, val), numPages || 1));
                   }}
                   className="w-12 text-center bg-slate-800/50 border border-slate-600 rounded py-0.5 outline-none focus:border-purple-400 focus:bg-slate-800 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                 />
                 <span>/ {numPages}</span>
               </div>

               <button onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))} disabled={pageNumber >= (numPages||1)} className="p-1.5 text-white disabled:opacity-30 hover:bg-slate-800 rounded-full transition-colors"><ChevronRight size={20}/></button>
             </div>
         )}
       </div>

       
       {showNotes && (<>
         {/* Draggable Resizer */}
       <div 
         className="w-1.5 cursor-col-resize bg-transparent hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-20 relative flex-shrink-0"
         onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }} onTouchStart={(e) => { e.preventDefault(); setIsDragging(true); }}
       >
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-slate-600 rounded-full opacity-50 pointer-events-none"></div>
       </div>

         {/* Handwriting Notebook Side */}
       <div style={{ width: notesWidth }} className={`flex-shrink-0 h-full border-l flex flex-col ${isDark ? 'border-slate-800 bg-[#12141c]' : 'border-gray-200 bg-[#fffdf5]'}`}>
         
         <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
           <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-400">
             <PenTool size={14}/> Pg. {pageNumber} Notes
           </div>
           
           <div className="flex items-center gap-3">
             <select 
               value={currentNote.lang} 
               onChange={e => setNotes(n => ({...n, [pageNumber]: {...currentNote, lang: e.target.value as 'en'|'ar'}}))}
               className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
             >
               <option value="en">English (Caveat)</option>
               <option value="ar">عربي (Lemonada)</option>
             </select>

             
           </div>
         </div>

         <textarea 
           value={currentNote.text}
           onChange={e => setNotes(n => ({...n, [pageNumber]: {...currentNote, text: e.target.value}}))}
           placeholder="Write your notes here..."
           dir={currentNote.lang === 'ar' ? 'rtl' : 'ltr'}
           className={`flex-1 w-full p-8 bg-transparent outline-none resize-none leading-[32px] ${
             currentNote.lang === 'ar' 
               ? 'font-[family-name:var(--font-lemonada)] text-right text-[1.1rem]' 
               : 'font-[family-name:var(--font-caveat)] text-left text-2xl tracking-wide'
           } ${isDark ? 'text-amber-100/90 placeholder:text-amber-100/20' : 'text-slate-800 placeholder:text-slate-300'}`}
           style={{
             backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(167, 139, 250, 0.3)'} 31px, ${isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(167, 139, 250, 0.3)'} 32px)`,
             backgroundAttachment: 'local'
           }}
         />
       </div>
         </>)}
    </div>
  )
}
