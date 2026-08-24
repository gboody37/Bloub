'use client';

import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, PenTool, Save, Check, Highlighter, Type, MousePointer2, ZoomIn, ZoomOut, Eraser, Undo2 } from 'lucide-react';
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
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [notesWidth, setNotesWidth] = useState(450);
  const [isDragging, setIsDragging] = useState(false);
  
  
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
      const text = prompt('Enter text:');
      if (text) {
        const x = (e.clientX - containerRect.left) / zoomLevel;
        const y = (e.clientY - containerRect.top) / zoomLevel;
        setAnnotations(prev => ({
          ...prev,
          [pageNumber]: [...(prev[pageNumber] || []), { id: Date.now(), type: 'text', x, y, text }]
        }));
        setPdfTool('cursor');
      }
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


  
  const handleParentMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    // Calculate new width from right edge of screen minus some padding
    const rect = e.currentTarget.getBoundingClientRect();
    const rightEdge = rect.right;
    const newWidth = rightEdge - e.clientX;
    setNotesWidth(Math.max(200, Math.min(newWidth, 800)));
  };
  const handleParentMouseUp = () => setIsDragging(false);

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // We fetch the latest frontmatter to not overwrite other things
      const { data: currentNote } = await supabase.from('vault_notes').select('content').eq('id', noteId).single();
      if (!currentNote) return;

            let content = currentNote.content;
      // Replace or inject pdf_notes in frontmatter
      const notesJson = JSON.stringify({ notes, annotations }).replace(/'/g, "''"); // SQL/YAML safe single quote escape
      
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

  const currentNote = notes[pageNumber] || { text: '', lang: 'en' };

  return (
    <div className={`flex w-full h-[650px] border rounded-2xl overflow-hidden shadow-inner ${isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-gray-100'}`}>
       
       {/* PDF Viewer Side */}
       <div className="flex-1 h-full overflow-auto custom-scrollbar flex flex-col items-center py-6 px-6 relative bg-black/20">
                  {/* PDF Toolbar */}
         <div className="sticky top-2 mb-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl z-50">
           <button onClick={() => setPdfTool('cursor')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'cursor' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}><MousePointer2 size={16}/></button>
           <button onClick={() => setPdfTool('highlight')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'highlight' ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`}><Highlighter size={16}/></button>
           <button onClick={() => setPdfTool('text')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'text' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-purple-400'}`}><Type size={16}/></button>

           <button onClick={() => setPdfTool('eraser')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'eraser' ? 'bg-pink-500/20 text-pink-400' : 'text-slate-400 hover:text-pink-400'}`}><Eraser size={16}/></button>
           <button onClick={handleUndo} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white"><Undo2 size={16}/></button>
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
           
           
           <div className="relative inline-block shadow-2xl" ref={overlayRef} onMouseUp={handleContainerMouseUp} style={{ cursor: pdfTool === 'text' ? 'text' : pdfTool === 'highlight' ? 'text' : pdfTool === 'eraser' ? 'crosshair' : 'default' }}>
             <div className="absolute inset-0 z-20" style={{ pointerEvents: pdfTool === "eraser" ? "auto" : "none" }}>
               {(annotations[pageNumber] || []).map(ann => {
                 if (ann.type === 'highlight') {
                   const w = Math.abs(ann.w) * zoomLevel;
                   const h = Math.abs(ann.h) * zoomLevel;
                   const left = ann.startX * zoomLevel;
                   const top = ann.startY * zoomLevel;
                   return <div key={ann.id} onMouseDown={(e) => { if(pdfTool==='eraser') { e.stopPropagation(); setAnnotations(p => ({...p, [pageNumber]: p[pageNumber].filter(a => a.id !== ann.id)})); } }} className="absolute bg-yellow-400/40 mix-blend-multiply" style={{ left, top, width: w, height: h, pointerEvents: pdfTool === 'eraser' ? 'auto' : 'none' }} />;
                 }
                 if (ann.type === 'text') {
                   return <div key={ann.id} onMouseDown={(e) => { if(pdfTool==='eraser') { e.stopPropagation(); setAnnotations(p => ({...p, [pageNumber]: p[pageNumber].filter(a => a.id !== ann.id)})); } }} className="absolute text-purple-600 font-bold text-lg bg-white/80 px-2 py-1 rounded shadow-sm border border-purple-200 whitespace-pre pointer-events-auto" style={{ left: ann.x * zoomLevel, top: ann.y * zoomLevel }}>{ann.text}</div>;
                 }
                 return null;
               })}
             </div>
             <Page 
               pageNumber={pageNumber} 
               renderTextLayer={true} 
               renderAnnotationLayer={true} 
               scale={zoomLevel} 
               className="rounded-lg overflow-hidden shadow-2xl transition-transform duration-300 transform-gpu"
             />
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

             <button
               onClick={handleSave}
               disabled={isSaving}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${saved ? 'bg-green-500/20 text-green-400' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
             >
               {saved ? <Check size={14}/> : <Save size={14}/>}
               {saved ? 'Saved' : 'Save'}
             </button>
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
    </div>
  )
}
