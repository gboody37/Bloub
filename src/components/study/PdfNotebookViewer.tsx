'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, PenTool, Save, Check, Highlighter, Type, MousePointer2, ZoomIn, ZoomOut, Eraser, Undo2, Sidebar, Hand, Eye, EyeOff, Square, Baseline } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateFrontmatterField } from '@/lib/obsidian/parser';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

interface PdfNotebookViewerProps {
  pdfUrl: string;
  noteId: string;
  notePath?: string;
  initialNotesStr?: string;
  isDark?: boolean;
  onUpdateNote?: (updatedContent: string) => void;
}

export default function PdfNotebookViewer({ pdfUrl, noteId, notePath, initialNotesStr, isDark = true, onUpdateNote }: PdfNotebookViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [notes, setNotes] = useState<Record<number, { text: string, lang: 'en' | 'ar' }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pdfTool, setPdfTool] = useState('cursor');
  const [textColor, setTextColor] = useState('#9333ea'); // default purple-600
  const [highlightColor, setHighlightColor] = useState('#fef08a'); // default yellow-200
  const [zoomLevel, setZoomLevel] = useState(1.0);

  const [notesWidth, setNotesWidth] = useState(450);
  const [isDragging, setIsDragging] = useState(false);
  const [showPdfUi, setShowPdfUi] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [pendingText, setPendingText] = useState<{x: number, y: number, text: string, color?: string, fontSize?: number, id?: number} | null>(null);
  const [viewerEngine, setViewerEngine] = useState<'pdfjs' | 'native'>('pdfjs');
  const [highlightMode, setHighlightMode] = useState<'box' | 'text'>('box');
  const [highlightStart, setHighlightStart] = useState<{x: number, y: number} | null>(null);
  const [highlightCurrent, setHighlightCurrent] = useState<{x: number, y: number} | null>(null);
  
  
  // Annotation State
  const [annotations, setAnnotations] = useState<Record<number, any[]>>({});
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const notesRef = useRef(notes);
  const annotationsRef = useRef(annotations);
  const pendingTextRef = useRef(pendingText);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    notesRef.current = notes;
    annotationsRef.current = annotations;
    pendingTextRef.current = pendingText;
  }, [notes, annotations, pendingText]);

  const getEventClientCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    if ('changedTouches' in e && e.changedTouches.length > 0) {
      return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    }
    if ('clientX' in e) {
      return { clientX: (e as React.MouseEvent).clientX, clientY: (e as React.MouseEvent).clientY };
    }
    return null;
  };
  
  const handleUndo = () => {
    setAnnotations(prev => {
      const pageAnns = prev[pageNumber] || [];
      if (pageAnns.length === 0) return prev;
      isDirtyRef.current = true;
      return {
        ...prev,
        [pageNumber]: pageAnns.slice(0, -1)
      };
    });
  };

  const handleContainerMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (!overlayRef.current) return;
    const containerRect = overlayRef.current.getBoundingClientRect();
    const coords = getEventClientCoords(e);
    if (!coords) return;
    
    if (pdfTool === 'text') {
      if (pendingText) return; // Don't create a new box if they are just clicking to blur the current one

      const x = (coords.clientX - containerRect.left) / zoomLevel;
      const y = (coords.clientY - containerRect.top) / zoomLevel;
      setPendingText({ x, y, text: '', color: textColor, fontSize: 24 });
      return;
    }

    if (pdfTool === 'highlight') {
        // Now handled by pointer events
      }
  };
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rightEdge = rect.right;
      let clientX = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
      } else if ('clientX' in e) {
        clientX = (e as MouseEvent).clientX;
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
  const prevNoteIdRef = useRef<string>(noteId);
  const prevNotePathRef = useRef<string | undefined>(notePath);

  // Reset or load annotations whenever noteId or initialNotesStr changes
  useEffect(() => {
    // If switching notes and previous note had dirty changes, flush save for previous note
    if (prevNoteIdRef.current && prevNoteIdRef.current !== noteId) {
      if (isDirtyRef.current) {
        handleSave(notesRef.current, annotationsRef.current, prevNoteIdRef.current, prevNotePathRef.current);
      }
      prevNoteIdRef.current = noteId;
      prevNotePathRef.current = notePath;

      if (initialNotesStr) {
        try {
          let parsed = typeof initialNotesStr === 'string' ? JSON.parse(initialNotesStr) : initialNotesStr;
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch {}
          }
          if (parsed && typeof parsed === 'object') {
            setNotes(parsed.notes || (!parsed.annotations ? parsed : {}));
            setAnnotations(parsed.annotations || {});
          } else {
            setNotes({});
            setAnnotations({});
          }
        } catch (e) {
          console.error("Failed to parse initial pdf notes", e);
          setNotes({});
          setAnnotations({});
        }
      } else {
        setNotes({});
        setAnnotations({});
      }
      isDirtyRef.current = false;
    } else {
      // Same note: only update if not dirty to prevent race condition clobbering active edits
      prevNotePathRef.current = notePath;
      if (!isDirtyRef.current && initialNotesStr) {
        try {
          let parsed = typeof initialNotesStr === 'string' ? JSON.parse(initialNotesStr) : initialNotesStr;
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch {}
          }
          if (parsed && typeof parsed === 'object') {
            const newNotes = parsed.notes || (!parsed.annotations ? parsed : {});
            const newAnnotations = parsed.annotations || {};
            if (JSON.stringify(newNotes) !== JSON.stringify(notesRef.current)) {
              setNotes(newNotes);
            }
            if (JSON.stringify(newAnnotations) !== JSON.stringify(annotationsRef.current)) {
              setAnnotations(newAnnotations);
            }
          }
        } catch {}
      }
    }
  }, [noteId, initialNotesStr, notePath]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const handleSave = async (forceNotes?: any, forceAnnotations?: any, targetNoteId?: string, targetNotePath?: string) => {
    let saveAnnotations = forceAnnotations !== undefined ? forceAnnotations : annotationsRef.current;
    
    // Commit any active pending text annotation before persisting
    if (pendingTextRef.current && pendingTextRef.current.text.trim()) {
      const pending = pendingTextRef.current;
      const newAnn = { id: Date.now(), type: 'text', ...pending };
      saveAnnotations = {
        ...saveAnnotations,
        [pageNumber]: [...(saveAnnotations[pageNumber] || []), newAnn]
      };
      setAnnotations(saveAnnotations);
      setPendingText(null);
      setPdfTool('cursor');
    }

    const saveNotes = forceNotes !== undefined ? forceNotes : notesRef.current;
    const effNoteId = targetNoteId || noteId;
    const effNotePath = targetNotePath || notePath || effNoteId;
    setIsSaving(true);
    try {
      let currentNote: { id: string; content: string; path: string } | null = null;

      // 1. Try querying by id
      const { data: byId } = await supabase
        .from('vault_notes')
        .select('id, content, path')
        .eq('id', effNoteId)
        .maybeSingle();

      if (byId) {
        currentNote = byId;
      } else {
        // 2. Try querying by path
        const { data: byPath } = await supabase
          .from('vault_notes')
          .select('id, content, path')
          .eq('path', effNotePath)
          .maybeSingle();
        if (byPath) {
          currentNote = byPath;
        }
      }

      const notesJson = JSON.stringify({ notes: saveNotes, annotations: saveAnnotations });
      const baseContent = currentNote?.content || (pdfUrl ? `---\npdf_url: '${pdfUrl}'\n---\n` : '');
      const updatedContent = updateFrontmatterField(baseContent, 'pdf_notes', notesJson);

      if (currentNote) {
        const { error: updateError } = await supabase
          .from('vault_notes')
          .update({ 
            content: updatedContent, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', currentNote.id);

        if (updateError) {
          throw updateError;
        }
      }

      if (onUpdateNote) {
        onUpdateNote(updatedContent);
      }
      
      isDirtyRef.current = false;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save PDF notebook:', e);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isDirtyRef.current) return;
    
    // Auto-save debounce (runs on any user mutation, including deletions)
    const timer = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(timer);
  }, [notes, annotations]);

  useEffect(() => {
    // Unmount & visibility change save
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isDirtyRef.current && prevNoteIdRef.current) {
        handleSave(notesRef.current, annotationsRef.current, prevNoteIdRef.current, prevNotePathRef.current);
      }
    };
    const handleBeforeUnload = () => {
      if (isDirtyRef.current && prevNoteIdRef.current) {
        handleSave(notesRef.current, annotationsRef.current, prevNoteIdRef.current, prevNotePathRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (isDirtyRef.current && prevNoteIdRef.current) {
        handleSave(notesRef.current, annotationsRef.current, prevNoteIdRef.current, prevNotePathRef.current);
      }
    };
  }, []);

  // Keyboard shortcut Ctrl+S / Cmd+S to immediately save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentNote = notes[pageNumber] || { text: "", lang: "en" };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (pdfTool === 'highlight' && highlightMode === 'text') {
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0 && selection.toString().trim().length > 0) {
            const range = selection.getRangeAt(0);
            const rects = range.getClientRects();
            if (rects.length > 0 && overlayRef.current) {
              const containerRect = overlayRef.current.getBoundingClientRect();
              let saveAnnotations = { ...annotations };
              
              for (let i = 0; i < rects.length; i++) {
                const rect = rects[i];
                const newAnn = {
                  id: Date.now() + i,
                  type: 'highlight',
                  startX: (rect.left - containerRect.left) / zoomLevel,
                  startY: (rect.top - containerRect.top) / zoomLevel,
                  w: rect.width / zoomLevel,
                  h: rect.height / zoomLevel,
                  color: highlightColor,
                  text: selection.toString()
                };
                saveAnnotations = {
                  ...saveAnnotations,
                  [pageNumber]: [...(saveAnnotations[pageNumber] || []), newAnn]
                };
              }
              isDirtyRef.current = true;
              setAnnotations(saveAnnotations);
              selection.removeAllRanges();
            }
          }
        }, 50);
      }
    };
    
    document.addEventListener('pointerup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('pointerup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [pdfTool, highlightMode, annotations, pageNumber, zoomLevel, highlightColor]);

  const toolsPortal = typeof document !== 'undefined' ? document.getElementById('pdf-tools-portal') : null;

  return (
    <div ref={containerRef} className={`flex w-full flex-1 h-full min-h-[500px] border rounded-2xl overflow-hidden shadow-inner ${isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-200 bg-gray-100'}`}>
      <style>{`
        .react-pdf__Page__textContent {
          line-height: 1 !important;
        }
        .react-pdf__Page__textContent > span {
          line-height: 1 !important;
        }
      `}</style>
       
       {/* PDF Viewer Side */}
       <div 
          className={`flex-1 h-full overflow-auto custom-scrollbar flex flex-col py-6 px-6 relative bg-black/20 ${(pdfTool === 'pan' || (pdfTool === 'highlight' && highlightMode === 'box')) ? 'touch-none' : ''}`}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button, input, select, .pointer-events-auto')) return;
            if (pdfTool === 'pan') {
              e.preventDefault();
              const container = e.currentTarget;
              if (e.pointerId) container.setPointerCapture(e.pointerId);
              const startX = e.clientX;
              const startY = e.clientY;
              const startScrollLeft = container.scrollLeft;
              const startScrollTop = container.scrollTop;
              
              const handleMove = (ev: any) => {
                container.scrollLeft = startScrollLeft - (ev.clientX - startX);
                container.scrollTop = startScrollTop - (ev.clientY - startY);
              };
              const handleUp = (ev: any) => {
                try {
                  if (ev.pointerId && container.hasPointerCapture && container.hasPointerCapture(ev.pointerId)) {
                    container.releasePointerCapture(ev.pointerId);
                  }
                } catch (err) {}
                window.removeEventListener('pointermove', handleMove);
                window.removeEventListener('pointerup', handleUp);
                window.removeEventListener('pointercancel', handleUp);
              };
              window.addEventListener('pointermove', handleMove);
              window.addEventListener('pointerup', handleUp);
              window.addEventListener('pointercancel', handleUp);
            }
          }}
          style={{ cursor: pdfTool === 'pan' ? 'grab' : 'default' }}
        >
          {/* PDF Toolbar rendered in portal */}
          {toolsPortal && createPortal(
             <div className="flex items-center gap-1.5">
               {viewerEngine === 'pdfjs' && (
                 <>
                   <button onClick={() => setPdfTool('pan')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'pan' ? 'text-purple-400 bg-purple-500/20' : 'text-slate-400 hover:text-white'}`} title="Pan Tool"><Hand size={16}/></button>
                   <button onClick={() => setPdfTool('cursor')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'cursor' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`} title="Pointer Tool"><MousePointer2 size={16}/></button>
                   <button onClick={() => setPdfTool('highlight')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'highlight' ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`} title="Highlighter Tool"><Highlighter size={16}/></button>
                   
                   <button onClick={() => setPdfTool('text')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'text' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-purple-400'}`} title="Text Note Tool"><Type size={16}/></button>
                   {pdfTool === 'highlight' && (
                       <div className="flex items-center gap-1 mx-1 bg-slate-800 rounded-lg p-1">
                         <button 
                           onPointerDown={(e) => e.preventDefault()} 
                           onClick={() => setHighlightMode(m => m === 'box' ? 'text' : 'box')} 
                           className={`flex items-center gap-1 px-2 py-0.5 mr-1 rounded border border-slate-700 bg-slate-900 text-xs font-bold text-white transition-colors hover:bg-slate-700`}
                           title={highlightMode === 'box' ? "Switch to Text Selection Mode" : "Switch to Box Drawing Mode"}
                         >
                           {highlightMode === 'box' ? <Square size={12}/> : <Baseline size={12}/>}
                           <span className="hidden sm:inline">{highlightMode === 'box' ? 'Box' : 'Text'}</span>
                         </button>
                         {['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff'].map(c => (
                           <button key={c} onPointerDown={(e) => e.preventDefault()} onClick={() => setHighlightColor(c)} className={`w-4 h-4 rounded-full border ${highlightColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />
                         ))}
                       </div>
                   )}
                   {pdfTool === 'text' && (
                       <div className="flex items-center gap-1 mx-1 bg-slate-800 rounded-lg p-1">
                         {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#9333ea', '#ec4899', '#ffffff', '#000000'].map(c => (
                           <button key={c} onPointerDown={(e) => e.preventDefault()} onClick={() => { setTextColor(c); if (pendingText) setPendingText({ ...pendingText, color: c }); }} className={`w-4 h-4 rounded-full border ${textColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />
                         ))}
                       </div>
                   )}
                   
                   <button onClick={() => setPdfTool('eraser')} className={`p-1.5 rounded-lg transition-colors ${pdfTool === 'eraser' ? 'bg-pink-500/20 text-pink-400' : 'text-slate-400 hover:text-pink-400'}`} title="Eraser Tool"><Eraser size={16}/></button>
                   <button onClick={handleUndo} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white" title="Undo Annotation"><Undo2 size={16}/></button>
                 </>
               )}
               <div className="w-px h-4 bg-slate-700/50 mx-1"></div>

                 <button 
                   onClick={() => setViewerEngine(v => v === 'pdfjs' ? 'native' : 'pdfjs')} 
                   className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors border ${viewerEngine === 'native' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'}`} 
                   title="Toggle PDF Engine (Native Browser vs Interactive)"
                 >
                   <Eye size={14}/>
                   <span className="text-xs font-bold hidden sm:inline">{viewerEngine === 'native' ? 'Native Viewer' : 'Interactive Viewer'}</span>
                 </button>

                 <div className="w-px h-4 bg-slate-700/50 mx-1"></div>

               <button onClick={() => setShowNotes(!showNotes)} className={`p-1.5 rounded-lg transition-colors ${showNotes ? 'text-blue-400 bg-blue-500/20' : 'text-slate-400 hover:text-white'}`} title="Toggle Notes Panel"><Sidebar size={16}/></button>
               <div className="w-px h-4 bg-slate-700/50 mx-1"></div>
               
               <button onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white" title="Zoom Out">
                 <ZoomOut size={16}/>
               </button>
               <div className="text-xs font-mono text-slate-400 font-bold min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</div>
               <button onClick={() => setZoomLevel(z => Math.min(z + 0.25, 3.0))} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white" title="Zoom In">
                 <ZoomIn size={16}/>
               </button>
             </div>,
             toolsPortal
          )}

         {viewerEngine === 'native' ? (
           <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full flex-1 border-0 bg-transparent rounded-xl" title="PDF Native Viewer" />
         ) : (
         <div className="w-fit mx-auto relative flex flex-col items-center">
           <Document 
              file={pdfUrl} 
              options={options}
              onLoadSuccess={onDocumentLoadSuccess} 
              loading={<div className="text-slate-400 font-mono text-sm animate-pulse flex h-full items-center">Loading Document...</div>}
              className="drop-shadow-2xl"
           >
           
           
            <div className="relative inline-block shadow-2xl" ref={overlayRef} 
                  onPointerDown={(e) => {
                    if (pdfTool === 'text') {
                      // let handleContainerMouseUp handle it
                    }
                    if (pdfTool === 'highlight' && highlightMode === 'box') {
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
                    if (pdfTool === 'highlight' && highlightMode === 'box' && highlightStart) {
                      e.preventDefault();
                      const coords = getEventClientCoords(e);
                      if (!coords) return;
                      const containerRect = e.currentTarget.getBoundingClientRect();
                      const x = (coords.clientX - containerRect.left) / zoomLevel;
                      const y = (coords.clientY - containerRect.top) / zoomLevel;
                      setHighlightCurrent({ x, y });
                    }
                  }}
                  onPointerUp={(e) => {
                    if (pdfTool === 'text') {
                      handleContainerMouseUp(e as any);
                    }
                    if (pdfTool === 'highlight' && highlightMode === 'box' && highlightStart && highlightCurrent) {
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
                      setPdfTool('cursor');
                    }
                  }} style={{ cursor: pdfTool === 'text' ? 'text' : pdfTool === 'highlight' ? 'crosshair' : pdfTool === 'eraser' ? 'crosshair' : 'default' }}>
              <div className="absolute inset-0 z-20" style={{ pointerEvents: (pdfTool === "eraser" || (pdfTool === "highlight" && highlightMode === "box") || pdfTool === "text") ? "auto" : "none" }}>
                {highlightStart && highlightCurrent && (
                  <div 
                    className="absolute border-2 border-yellow-400 bg-yellow-400/20"
                    style={{
                      left: Math.min(highlightStart.x, highlightCurrent.x) * zoomLevel,
                      top: Math.min(highlightStart.y, highlightCurrent.y) * zoomLevel,
                      width: Math.abs(highlightCurrent.x - highlightStart.x) * zoomLevel,
                      height: Math.abs(highlightCurrent.y - highlightStart.y) * zoomLevel
                    }}
                  />
                )}
                {(annotations[pageNumber] || []).map(ann => {
                  if (ann.type === 'highlight') {
                    const w = Math.abs(ann.w) * zoomLevel;
                    const h = Math.abs(ann.h) * zoomLevel;
                    const left = ann.startX * zoomLevel;
                    const top = ann.startY * zoomLevel;
                    return (
                      <div 
                        key={ann.id} 
                        onMouseDown={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }} 
                        onTouchStart={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }} 
                        className={`absolute ${pdfTool === 'eraser' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`} 
                        style={{ backgroundColor: (ann.color && ann.color.length === 7) ? ann.color + '80' : (ann.color || '#facc1580'), left, top, width: w, height: h }}
                        title={ann.text} 
                      />
                    );
                  }
                  if (ann.type === 'text') {
                    return (
                      <div 
                        key={ann.id} 
                        onMouseDown={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } else if (pdfTool === 'cursor' || pdfTool === 'text') { e.stopPropagation(); setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id }); setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }} 
                        onTouchStart={(e) => { if (pdfTool === 'eraser') { e.stopPropagation(); isDirtyRef.current = true; setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } else if (pdfTool === 'cursor' || pdfTool === 'text') { e.stopPropagation(); setPendingText({ x: ann.x, y: ann.y, text: ann.text, color: ann.color, fontSize: ann.fontSize || 24, id: ann.id }); setAnnotations(p => ({ ...p, [pageNumber]: (p[pageNumber] || []).filter(a => a.id !== ann.id) })); } }} 
                        className={`absolute font-bold bg-transparent px-2 py-1 whitespace-pre select-none ${(pdfTool === 'eraser' || pdfTool === 'cursor' || pdfTool === 'text') ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`} 
                        style={{ 
                          left: ann.x * zoomLevel, 
                          top: ann.y * zoomLevel, 
                          fontSize: `${Math.max(12, Math.round((ann.fontSize || 24) * zoomLevel))}px`,
                          lineHeight: 1.2,
                          fontFamily: (ann.text || '').match(/[\u0600-\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)', 
                          color: ann.color || '#9333ea',
                          pointerEvents: (pdfTool === 'eraser' || pdfTool === 'cursor' || pdfTool === 'text') ? 'auto' : 'none'
                        }} 
                        dir="auto"
                      >
                        {ann.text}
                      </div>
                    );
                  }
                  return null;
                })}

                {pendingText && (
                  <div 
                    className="absolute z-50 flex flex-col gap-1 pointer-events-none"
                    style={{ 
                      left: pendingText.x * zoomLevel, 
                      top: pendingText.y * zoomLevel - 30
                    }}
                  >
                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded shadow-lg pointer-events-auto border border-slate-700 w-max">
                      <button 
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingText({ ...pendingText, fontSize: Math.max(12, (pendingText.fontSize || 24) - 2) }); }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 text-xs font-bold"
                      >A-</button>
                      <button 
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPendingText({ ...pendingText, fontSize: Math.min(72, (pendingText.fontSize || 24) + 2) }); }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 text-xs font-bold"
                      >A+</button>
                      <div 
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.pointerId) e.currentTarget.setPointerCapture(e.pointerId);
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const startPX = pendingText.x;
                          const startPY = pendingText.y;
                          const handleMove = (ev: any) => {
                             setPendingText(p => p ? { ...p, x: startPX + (ev.clientX - startX) / zoomLevel, y: startPY + (ev.clientY - startY) / zoomLevel } : p);
                          };
                          const handleUp = (ev: any) => {
                             try {
                               if (ev.pointerId && ev.currentTarget && typeof ev.currentTarget.releasePointerCapture === 'function') {
                                 ev.currentTarget.releasePointerCapture(ev.pointerId);
                               }
                             } catch (err) {}
                             window.removeEventListener('pointermove', handleMove);
                             window.removeEventListener('pointerup', handleUp);
                             window.removeEventListener('pointercancel', handleUp);
                          };
                          window.addEventListener('pointermove', handleMove);
                          window.addEventListener('pointerup', handleUp);
                          window.addEventListener('pointercancel', handleUp);
                        }}
                        className="px-2 h-6 flex items-center justify-center rounded bg-purple-600 text-white hover:bg-purple-500 text-xs font-bold cursor-move touch-none"
                      >
                        Drag to Move
                      </div>
                    </div>
                    <input
                      autoFocus
                      type="text"
                      dir="auto"
                      value={pendingText.text}
                      onChange={(e) => setPendingText({ ...pendingText, text: e.target.value })}
                      onBlur={() => {
                        if (pendingText.text.trim()) {
                          isDirtyRef.current = true;
                          setAnnotations(prev => ({
                            ...prev,
                            [pageNumber]: [...(prev[pageNumber] || []), { id: pendingText.id || Date.now(), type: 'text', ...pendingText }]
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
                      className="font-bold bg-transparent px-2 py-1 border-2 border-dashed border-purple-500/50 outline-none pointer-events-auto min-w-[150px]"
                      style={{ 
                        marginTop: '30px',
                        fontSize: `${Math.max(12, Math.round((pendingText.fontSize || 24) * zoomLevel))}px`,
                        lineHeight: 1.2,
                        fontFamily: pendingText.text.match(/[\u0600-\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)',
                        color: pendingText.color || textColor
                      }}
                    />
                  </div>
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
          </div>
         )}
           
         {viewerEngine === 'pdfjs' && numPages && (
           <div className="sticky bottom-6 mt-6 left-1/2 -translate-x-1/2 w-max flex items-center gap-4 bg-slate-900/90 backdrop-blur px-6 py-3 rounded-full border border-slate-700 shadow-2xl z-50">
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
               onChange={e => {
                 isDirtyRef.current = true;
                 setNotes(n => ({...n, [pageNumber]: {...currentNote, lang: e.target.value as 'en'|'ar'}}));
               }}
               className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
             >
               <option value="en">English (Caveat)</option>
               <option value="ar">عربي (Lemonada)</option>
             </select>

             
           </div>
         </div>

         <textarea 
           value={currentNote.text}
           onChange={e => {
             isDirtyRef.current = true;
             setNotes(n => ({...n, [pageNumber]: {...currentNote, text: e.target.value}}));
           }}
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
