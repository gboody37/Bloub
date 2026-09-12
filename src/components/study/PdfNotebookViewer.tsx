'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import ArabicTextLayer from './ArabicTextLayer';
import NotesPanel from './NotesPanel';
import {
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Type,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  Eraser,
  Undo2,
  Sidebar,
  Hand,
  Eye,
  Square,
  Baseline,
  Save,
  Check
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateFrontmatterField } from '@/lib/obsidian/parser';
import { recordMutation, markMutationSynced, markMutationFailed } from '@/lib/storage/offline-wal';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

export interface PdfNotebookViewerProps {
  pdfUrl: string;
  noteId?: string;
  notePath?: string;
  initialNotesStr?: string;
  isDark?: boolean;
  onUpdateNote?: ((updatedContent: string) => void) | ((noteId: string, updates: { content?: string; frontmatter?: any }) => void);
  onPageChange?: (pageNumber: number) => void;
}

interface RenderedPdfPageProps {
  pageNumber: number;
  zoomLevel: number;
  pdfTool: string;
  highlightMode: 'box' | 'text';
  highlightColor: string;
  textColor: string;
  annotations: any[];
  activeDrawing: {
    pageNumber: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null;
  pendingText: {
    pageNumber: number;
    x: number;
    y: number;
    text: string;
    color?: string;
    fontSize?: number;
    id?: number;
  } | null;
  onPageProxyLoaded?: (pageNumber: number, proxy: any) => void;
  onPageDimensionsLoaded?: (pageNumber: number, width: number, height: number) => void;
  onEraseAnnotation: (pageNumber: number, annId: any) => void;
  onEditTextAnnotation: (pageNumber: number, ann: any) => void;
  onCommitPendingText: () => void;
  setPendingText: React.Dispatch<any>;
}

const RenderedPdfPage = React.memo(function RenderedPdfPage({
  pageNumber,
  zoomLevel,
  pdfTool,
  highlightMode,
  highlightColor,
  textColor,
  annotations,
  activeDrawing,
  pendingText,
  onPageProxyLoaded,
  onPageDimensionsLoaded,
  onEraseAnnotation,
  onEditTextAnnotation,
  onCommitPendingText,
  setPendingText,
}: RenderedPdfPageProps) {
  const [pageProxy, setPageProxy] = useState<any>(null);
  const [pageViewport, setPageViewport] = useState<any>(null);
  const [pageTextContent, setPageTextContent] = useState<any>(null);

  const handlePageLoadSuccess = (proxy: any) => {
    setPageProxy(proxy);
    onPageProxyLoaded?.(pageNumber, proxy);
    try {
      const vp = proxy.getViewport ? proxy.getViewport({ scale: zoomLevel }) : null;
      setPageViewport(vp);
      const baseVp = proxy.getViewport ? proxy.getViewport({ scale: 1.0 }) : null;
      if (baseVp) {
        onPageDimensionsLoaded?.(pageNumber, baseVp.width, baseVp.height);
      }
      if (typeof proxy.getTextContent === 'function') {
        proxy.getTextContent().then((tc: any) => {
          setPageTextContent(tc);
        }).catch((err: any) => {
          console.error(`Failed to extract text content on page ${pageNumber}:`, err);
        });
      }
    } catch (e) {
      console.error(`Error in page load success for page ${pageNumber}:`, e);
    }
  };

  useEffect(() => {
    if (pageProxy && typeof pageProxy.getViewport === 'function') {
      const vp = pageProxy.getViewport({ scale: zoomLevel });
      setPageViewport(vp);
    }
  }, [zoomLevel, pageProxy]);

  return (
    <>
      {/* react-pdf canvas page */}
      <Page
        pageNumber={pageNumber}
        renderTextLayer={false}
        renderAnnotationLayer={true}
        scale={zoomLevel}
        onLoadSuccess={handlePageLoadSuccess}
        className="rounded-lg overflow-hidden shadow-2xl transition-transform duration-150 transform-gpu"
      />

      {/* Custom High-Precision Arabic RTL Text Layer */}
      {pageProxy && (
        <ArabicTextLayer
          pageNumber={pageNumber}
          viewport={pageViewport}
          textContent={pageTextContent}
          scale={zoomLevel}
          page={pageProxy}
        />
      )}

      {/* Per-Page Annotations Layer */}
      <div
        className="absolute inset-0 z-20"
        data-page-number={pageNumber}
        style={{
          pointerEvents: (pdfTool === 'eraser' || (pdfTool === 'highlight' && highlightMode === 'box') || pdfTool === 'text' || pdfTool === 'cursor') ? 'auto' : 'none'
        }}
      >
        {/* Active box highlight being drawn */}
        {activeDrawing && (
          <div
            className="absolute border-2 border-yellow-400 bg-yellow-400/20 pointer-events-none"
            style={{
              left: Math.min(activeDrawing.startX, activeDrawing.currentX) * zoomLevel,
              top: Math.min(activeDrawing.startY, activeDrawing.currentY) * zoomLevel,
              width: Math.abs(activeDrawing.currentX - activeDrawing.startX) * zoomLevel,
              height: Math.abs(activeDrawing.currentY - activeDrawing.startY) * zoomLevel,
            }}
          />
        )}

        {/* Existing page annotations */}
        {annotations.map((ann) => {
          if (ann.type === 'highlight') {
            const w = Math.abs(ann.w) * zoomLevel;
            const h = Math.abs(ann.h) * zoomLevel;
            const left = ann.startX * zoomLevel;
            const top = ann.startY * zoomLevel;
            return (
              <div
                key={ann.id}
                onMouseDown={(e) => {
                  if (pdfTool === 'eraser') {
                    e.stopPropagation();
                    onEraseAnnotation(pageNumber, ann.id);
                  }
                }}
                onTouchStart={(e) => {
                  if (pdfTool === 'eraser') {
                    e.stopPropagation();
                    onEraseAnnotation(pageNumber, ann.id);
                  }
                }}
                className={`absolute ${pdfTool === 'eraser' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
                style={{
                  backgroundColor: (ann.color && ann.color.length === 7) ? ann.color + '80' : (ann.color || '#facc1580'),
                  left,
                  top,
                  width: w,
                  height: h,
                }}
                title={ann.text}
              />
            );
          }
          if (ann.type === 'text') {
            return (
              <div
                key={ann.id}
                onMouseDown={(e) => {
                  if (pdfTool === 'eraser') {
                    e.stopPropagation();
                    onEraseAnnotation(pageNumber, ann.id);
                  } else if (pdfTool === 'cursor' || pdfTool === 'text') {
                    e.stopPropagation();
                    onEditTextAnnotation(pageNumber, ann);
                  }
                }}
                onTouchStart={(e) => {
                  if (pdfTool === 'eraser') {
                    e.stopPropagation();
                    onEraseAnnotation(pageNumber, ann.id);
                  } else if (pdfTool === 'cursor' || pdfTool === 'text') {
                    e.stopPropagation();
                    onEditTextAnnotation(pageNumber, ann);
                  }
                }}
                className={`absolute font-bold bg-transparent px-2 py-1 whitespace-pre select-none ${(pdfTool === 'eraser' || pdfTool === 'cursor' || pdfTool === 'text') ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
                style={{
                  left: ann.x * zoomLevel,
                  top: ann.y * zoomLevel,
                  fontSize: `${Math.max(12, Math.round((ann.fontSize || 24) * zoomLevel))}px`,
                  lineHeight: 1.2,
                  fontFamily: (ann.text || '').match(/[\u0600-\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)',
                  color: ann.color || '#9333ea',
                }}
                dir="auto"
              >
                {ann.text}
              </div>
            );
          }
          return null;
        })}

        {/* Active pending text note on this page */}
        {pendingText && (
          <div
            className="absolute z-50 flex flex-col gap-1 pointer-events-none"
            style={{
              left: pendingText.x * zoomLevel,
              top: pendingText.y * zoomLevel - 30,
            }}
          >
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded shadow-lg pointer-events-auto border border-slate-700 w-max">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPendingText((p: any) => p ? { ...p, fontSize: Math.max(12, (p.fontSize || 24) - 2) } : null);
                }}
                className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 text-xs font-bold"
              >
                A-
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPendingText((p: any) => p ? { ...p, fontSize: Math.min(72, (p.fontSize || 24) + 2) } : null);
                }}
                className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 text-xs font-bold"
              >
                A+
              </button>
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
                    setPendingText((p: any) => p ? {
                      ...p,
                      x: startPX + (ev.clientX - startX) / zoomLevel,
                      y: startPY + (ev.clientY - startY) / zoomLevel,
                    } : p);
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
              onChange={(e) => setPendingText((p: any) => p ? { ...p, text: e.target.value } : null)}
              onBlur={onCommitPendingText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
                if (e.key === 'Escape') {
                  setPendingText(null);
                }
              }}
              className="font-bold bg-transparent px-2 py-1 border-2 border-dashed border-purple-500/50 outline-none pointer-events-auto min-w-[150px]"
              style={{
                marginTop: '30px',
                fontSize: `${Math.max(12, Math.round((pendingText.fontSize || 24) * zoomLevel))}px`,
                lineHeight: 1.2,
                fontFamily: pendingText.text.match(/[\u0600-\u06FF]/) ? 'var(--font-lemonada)' : 'var(--font-caveat)',
                color: pendingText.color || textColor,
              }}
            />
          </div>
        )}
      </div>
    </>
  );
});

export default function PdfNotebookViewer({
  pdfUrl,
  noteId = '',
  notePath,
  initialNotesStr,
  isDark = true,
  onUpdateNote,
  onPageChange
}: PdfNotebookViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [notes, setNotes] = useState<Record<number, { text: string; lang: 'en' | 'ar' }>>({});
  const [annotations, setAnnotations] = useState<Record<number, any[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pdfTool, setPdfTool] = useState('cursor');
  const [textColor, setTextColor] = useState('#9333ea'); // default purple-600
  const [highlightColor, setHighlightColor] = useState('#fef08a'); // default yellow-200
  const [zoomLevel, setZoomLevel] = useState(1.0);

  const [notesWidth, setNotesWidth] = useState(450);
  const [isDragging, setIsDragging] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [viewerEngine, setViewerEngine] = useState<'pdfjs' | 'native'>('pdfjs');
  const [highlightMode, setHighlightMode] = useState<'box' | 'text'>('box');

  // Multi-page page size cache and virtualization set
  const [defaultPageSize, setDefaultPageSize] = useState<{ width: number; height: number }>({ width: 595.28, height: 841.89 }); // Standard A4
  const [pageSizes, setPageSizes] = useState<Record<number, { width: number; height: number }>>({});
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1, 2]));

  // Active annotation creation state
  const [highlightDrawing, setHighlightDrawing] = useState<{
    pageNumber: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const [pendingText, setPendingText] = useState<{
    pageNumber: number;
    x: number;
    y: number;
    text: string;
    color?: string;
    fontSize?: number;
    id?: number;
  } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const notesRef = useRef(notes);
  const annotationsRef = useRef(annotations);
  const pendingTextRef = useRef(pendingText);
  const isDirtyRef = useRef(false);
  const pageNumberRef = useRef(pageNumber);
  const isProgrammaticScrollingRef = useRef(false);
  const prevActivePageRef = useRef(pageNumber);

  useEffect(() => {
    notesRef.current = notes;
    annotationsRef.current = annotations;
    pendingTextRef.current = pendingText;
    pageNumberRef.current = pageNumber;
  }, [notes, annotations, pendingText, pageNumber]);

  const getEventClientCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent | React.PointerEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    if ('changedTouches' in e && e.changedTouches.length > 0) {
      return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    }
    if ('clientX' in e) {
      return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
    }
    return null;
  };

  const handleUndo = () => {
    setAnnotations(prev => {
      const pageAnns = prev[pageNumber] || [];
      if (pageAnns.length > 0) {
        isDirtyRef.current = true;
        const next = {
          ...prev,
          [pageNumber]: pageAnns.slice(0, -1)
        };
        annotationsRef.current = next;
        return next;
      }
      // If active page has no annotations, undo on most recent annotated page
      const pagesWithAnns = Object.keys(prev)
        .map(Number)
        .filter(p => (prev[p] || []).length > 0)
        .sort((a, b) => b - a);

      if (pagesWithAnns.length > 0) {
        const targetP = pagesWithAnns[0];
        isDirtyRef.current = true;
        const next = {
          ...prev,
          [targetP]: (prev[targetP] || []).slice(0, -1)
        };
        annotationsRef.current = next;
        return next;
      }
      return prev;
    });
  };

  const containerRef = useRef<HTMLDivElement>(null);

  // Resize Notes Panel logic
  useEffect(() => {
    let rafId: number | null = null;
    let latestWidth: number | null = null;

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
      const newWidth = Math.max(200, Math.min(rightEdge - clientX, Math.max(200, rect.width - 300)));
      latestWidth = newWidth;

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (latestWidth !== null) {
            setNotesWidth(latestWidth);
          }
          rafId = null;
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (latestWidth !== null) {
        setNotesWidth(latestWidth);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalMouseMove, { passive: false });
      window.addEventListener('touchend', handleGlobalMouseUp);
    }
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalMouseMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging]);

  const supabase = createClient();
  const prevNoteIdRef = useRef<string>(noteId);
  const prevNotePathRef = useRef<string | undefined>(notePath);

  const handleSave = async (forceNotes?: any, forceAnnotations?: any, targetNoteId?: string, targetNotePath?: string) => {
    let saveAnnotations = forceAnnotations !== undefined ? forceAnnotations : annotationsRef.current;

    // Commit any active pending text annotation before persisting
    if (pendingTextRef.current && pendingTextRef.current.text.trim()) {
      const pending = pendingTextRef.current;
      const newAnn = { id: pending.id || Date.now(), type: 'text', ...pending };
      saveAnnotations = {
        ...saveAnnotations,
        [pending.pageNumber]: [...(saveAnnotations[pending.pageNumber] || []), newAnn]
      };
      setAnnotations(saveAnnotations);
      annotationsRef.current = saveAnnotations;
      setPendingText(null);
    }

    const saveNotes = forceNotes !== undefined ? forceNotes : notesRef.current;
    const effNoteId = targetNoteId || noteId;
    const effNotePath = targetNotePath || notePath || effNoteId;
    setIsSaving(true);

    // Durable Offline WAL logging before network operations
    const walPayload = {
      noteId: effNoteId,
      notePath: effNotePath,
      pdfNotes: {
        notes: saveNotes,
        annotations: saveAnnotations
      }
    };

    let walId: string | null = null;
    try {
      walId = await recordMutation({
        type: 'SAVE_PDF_ANNOTATIONS',
        payload: walPayload
      });
    } catch (walErr) {
      console.warn('[OfflineWAL] Failed to record PDF annotations mutation:', walErr);
    }

    try {
      let currentNote: { id: string; content: string; path: string } | null = null;

      if (effNoteId) {
        const { data: byId } = await supabase
          .from('vault_notes')
          .select('id, content, path')
          .eq('id', effNoteId)
          .maybeSingle();
        if (byId) {
          currentNote = byId;
        }
      }

      if (!currentNote && effNotePath) {
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

      if (walId) {
        await markMutationSynced(walId);
      }

      if (onUpdateNote) {
        if (typeof onUpdateNote === 'function') {
          if (onUpdateNote.length > 1 && effNoteId) {
            (onUpdateNote as any)(effNoteId, { content: updatedContent });
          } else {
            (onUpdateNote as any)(updatedContent);
          }
        }
      }

      isDirtyRef.current = false;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      console.error('Failed to save PDF notebook:', e);
      if (walId) {
        await markMutationFailed(walId, e?.message || 'Save failed');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const flushPendingState = useCallback((forceNotes?: any, forceAnnotations?: any, targetNoteId?: string, targetNotePath?: string) => {
    if (!isDirtyRef.current) return;

    let saveAnnotations = forceAnnotations !== undefined ? forceAnnotations : annotationsRef.current;

    if (pendingTextRef.current && pendingTextRef.current.text.trim()) {
      const pending = pendingTextRef.current;
      const newAnn = { id: pending.id || Date.now(), type: 'text', ...pending };
      saveAnnotations = {
        ...saveAnnotations,
        [pending.pageNumber]: [...(saveAnnotations[pending.pageNumber] || []), newAnn]
      };
      annotationsRef.current = saveAnnotations;
      setAnnotations(saveAnnotations);
      setPendingText(null);
    }

    const saveNotes = forceNotes !== undefined ? forceNotes : notesRef.current;
    const effNoteId = targetNoteId || prevNoteIdRef.current || noteId;
    const effNotePath = targetNotePath || prevNotePathRef.current || notePath || effNoteId;

    if (!effNoteId && !effNotePath) return;

    const payload = {
      noteId: effNoteId,
      notePath: effNotePath,
      pdfNotes: {
        notes: saveNotes,
        annotations: saveAnnotations
      }
    };

    recordMutation({
      type: 'SAVE_PDF_ANNOTATIONS',
      payload
    }).catch(err => {
      console.warn('[OfflineWAL] flushPendingState recordMutation warning:', err);
    });

    const payloadStr = JSON.stringify(payload);
    let beaconSent = false;
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([payloadStr], { type: 'application/json' });
        beaconSent = navigator.sendBeacon('/api/obsidian/flush', blob);
      } catch (err) {
        beaconSent = false;
      }
    }

    if (!beaconSent && typeof fetch !== 'undefined') {
      try {
        fetch('/api/obsidian/flush', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payloadStr,
          keepalive: true
        }).catch(() => {});
      } catch (err) {}
    }

    handleSave(saveNotes, saveAnnotations, effNoteId, effNotePath);
    isDirtyRef.current = false;
  }, [noteId, notePath]);

  // Reset or load annotations whenever noteId or initialNotesStr changes
  useEffect(() => {
    if (prevNoteIdRef.current && prevNoteIdRef.current !== noteId) {
      if (isDirtyRef.current) {
        flushPendingState(notesRef.current, annotationsRef.current, prevNoteIdRef.current, prevNotePathRef.current);
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
            const nextNotes = parsed.notes || (!parsed.annotations ? parsed : {});
            const nextAnns = parsed.annotations || {};
            setNotes(nextNotes);
            setAnnotations(nextAnns);
            notesRef.current = nextNotes;
            annotationsRef.current = nextAnns;
          } else {
            setNotes({});
            setAnnotations({});
            notesRef.current = {};
            annotationsRef.current = {};
          }
        } catch (e) {
          console.error("Failed to parse initial pdf notes", e);
          setNotes({});
          setAnnotations({});
          notesRef.current = {};
          annotationsRef.current = {};
        }
      } else {
        setNotes({});
        setAnnotations({});
        notesRef.current = {};
        annotationsRef.current = {};
      }
      isDirtyRef.current = false;
    } else {
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
              notesRef.current = newNotes;
            }
            if (JSON.stringify(newAnnotations) !== JSON.stringify(annotationsRef.current)) {
              setAnnotations(newAnnotations);
              annotationsRef.current = newAnnotations;
            }
          }
        } catch {}
      }
    }
  }, [noteId, initialNotesStr, notePath, flushPendingState]);

  // Document load success handler
  function onDocumentLoadSuccess(pdfDoc: any): void {
    const pagesCount = pdfDoc?.numPages || 1;
    setNumPages(pagesCount);
    setPageNumber(1);
    onPageChange?.(1);

    if (pdfDoc && typeof pdfDoc.getPage === 'function') {
      pdfDoc.getPage(1).then((page1: any) => {
        const vp = page1.getViewport({ scale: 1.0 });
        setDefaultPageSize({ width: vp.width, height: vp.height });
        setPageSizes(prev => ({
          ...prev,
          [1]: { width: vp.width, height: vp.height }
        }));
      }).catch((err: any) => {
        console.warn('Failed to get page 1 dimensions:', err);
      });
    }
  }

  // Cache dimensions when pages report their true unscaled dimensions
  const handlePageDimensionsLoaded = useCallback((pg: number, width: number, height: number) => {
    setPageSizes(prev => {
      if (prev[pg]?.width === width && prev[pg]?.height === height) return prev;
      return { ...prev, [pg]: { width, height } };
    });
  }, []);

  const handlePageProxyLoaded = useCallback((_pg: number, _proxy: any) => {}, []);

  const handleCommitPendingText = useCallback(() => {
    if (pendingTextRef.current && pendingTextRef.current.text.trim()) {
      const pt = pendingTextRef.current;
      const newAnn = {
        id: pt.id || Date.now(),
        type: 'text',
        x: pt.x,
        y: pt.y,
        text: pt.text,
        color: pt.color || textColor,
        fontSize: pt.fontSize || 24,
      };
      isDirtyRef.current = true;
      setAnnotations(prev => {
        const updated = {
          ...prev,
          [pt.pageNumber]: [...(prev[pt.pageNumber] || []), newAnn],
        };
        annotationsRef.current = updated;
        return updated;
      });
    }
    setPendingText(null);
  }, [textColor]);

  const handleEraseAnnotation = useCallback((pg: number, annId: any) => {
    isDirtyRef.current = true;
    setAnnotations(prev => {
      const next = {
        ...prev,
        [pg]: (prev[pg] || []).filter(a => a.id !== annId),
      };
      annotationsRef.current = next;
      return next;
    });
  }, []);

  const handleEditTextAnnotation = useCallback((pg: number, ann: any) => {
    setPendingText({
      pageNumber: pg,
      x: ann.x,
      y: ann.y,
      text: ann.text,
      color: ann.color,
      fontSize: ann.fontSize || 24,
      id: ann.id,
    });
    handleEraseAnnotation(pg, ann.id);
  }, [handleEraseAnnotation]);

  // Page pointer-down for box highlighting and text placement
  const handlePagePointerDown = (pg: number, e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, .pointer-events-auto')) return;

    if (pdfTool === 'text') {
      if (pendingText) {
        handleCommitPendingText();
        return;
      }
      const coords = getEventClientCoords(e);
      if (!coords) return;
      const pageEl = pageRefs.current[pg];
      if (!pageEl) return;
      const pageRect = pageEl.getBoundingClientRect();
      const x = (coords.clientX - pageRect.left) / zoomLevel;
      const y = (coords.clientY - pageRect.top) / zoomLevel;
      setPendingText({
        pageNumber: pg,
        x,
        y,
        text: '',
        color: textColor,
        fontSize: 24,
      });
      return;
    }

    if (pdfTool === 'highlight' && highlightMode === 'box') {
      e.preventDefault();
      const coords = getEventClientCoords(e);
      if (!coords) return;
      const pageEl = pageRefs.current[pg];
      if (!pageEl) return;
      const pageRect = pageEl.getBoundingClientRect();
      const x = (coords.clientX - pageRect.left) / zoomLevel;
      const y = (coords.clientY - pageRect.top) / zoomLevel;
      setHighlightDrawing({
        pageNumber: pg,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      });
      return;
    }
  };

  // Global pointer-move and pointer-up for box highlight drawing
  useEffect(() => {
    if (!highlightDrawing) return;

    const handlePointerMove = (e: PointerEvent) => {
      const pg = highlightDrawing.pageNumber;
      const pageEl = pageRefs.current[pg];
      if (!pageEl) return;
      const pageRect = pageEl.getBoundingClientRect();
      const currentX = (e.clientX - pageRect.left) / zoomLevel;
      const currentY = (e.clientY - pageRect.top) / zoomLevel;
      setHighlightDrawing(prev => prev ? { ...prev, currentX, currentY } : null);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const pg = highlightDrawing.pageNumber;
      const pageEl = pageRefs.current[pg];
      if (pageEl) {
        const pageRect = pageEl.getBoundingClientRect();
        const currentX = (e.clientX - pageRect.left) / zoomLevel;
        const currentY = (e.clientY - pageRect.top) / zoomLevel;
        const startX = Math.min(highlightDrawing.startX, currentX);
        const startY = Math.min(highlightDrawing.startY, currentY);
        const w = Math.abs(currentX - highlightDrawing.startX);
        const h = Math.abs(currentY - highlightDrawing.startY);

        if (w > 3 && h > 3) {
          const newAnn = {
            id: Date.now(),
            type: 'highlight',
            startX,
            startY,
            w,
            h,
            color: highlightColor,
          };
          isDirtyRef.current = true;
          setAnnotations(prev => {
            const updated = {
              ...prev,
              [pg]: [...(prev[pg] || []), newAnn],
            };
            annotationsRef.current = updated;
            return updated;
          });
        }
      }
      setHighlightDrawing(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [highlightDrawing, zoomLevel, highlightColor]);

  // Global text-selection highlight mode listener
  useEffect(() => {
    const handleTextSelectionPointerUp = () => {
      if (pdfTool === 'highlight' && highlightMode === 'text') {
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0 && selection.toString().trim().length > 0) {
            const range = selection.getRangeAt(0);
            const anchorNode = selection.anchorNode;
            const targetEl = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
            const fallbackPageEl = targetEl?.closest('[data-page-number]') as HTMLElement | null;
            const rects = range.getClientRects();
            if (rects.length > 0) {
              const newAnnsByPage: Record<number, any[]> = {};
              let hasNewAnns = false;
              for (let i = 0; i < rects.length; i++) {
                const rect = rects[i];
                if (rect.width < 3 || rect.height < 3) continue;

                // Resolve enclosing page container for this specific rect (supporting cross-page selections)
                const midX = rect.left + rect.width / 2;
                const midY = rect.top + rect.height / 2;
                const elAtPoint = typeof document.elementFromPoint === 'function'
                  ? document.elementFromPoint(midX, midY)
                  : null;
                let pageContainer = (elAtPoint?.closest('[data-page-number]') as HTMLElement | null) || fallbackPageEl;

                // Fallback: match geometrically against pageRefs if elementFromPoint didn't resolve a container
                if (!pageContainer && pageRefs.current) {
                  for (const el of Object.values(pageRefs.current)) {
                    if (!el) continue;
                    const r = el.getBoundingClientRect();
                    if (midY >= r.top && midY <= r.bottom && midX >= r.left && midX <= r.right) {
                      pageContainer = el;
                      break;
                    }
                  }
                }

                if (!pageContainer) continue;

                const targetPageNum = parseInt(pageContainer.getAttribute('data-page-number') || String(pageNumber), 10);
                const targetPageRect = pageContainer.getBoundingClientRect();

                if (!newAnnsByPage[targetPageNum]) {
                  newAnnsByPage[targetPageNum] = [];
                }

                newAnnsByPage[targetPageNum].push({
                  id: Date.now() + i,
                  type: 'highlight',
                  startX: (rect.left - targetPageRect.left) / zoomLevel,
                  startY: (rect.top - targetPageRect.top) / zoomLevel,
                  w: rect.width / zoomLevel,
                  h: rect.height / zoomLevel,
                  color: highlightColor,
                  text: selection.toString(),
                });
                hasNewAnns = true;
              }

              if (hasNewAnns) {
                isDirtyRef.current = true;
                setAnnotations(prev => {
                  const updated = { ...prev };
                  for (const [pNumStr, pageAnns] of Object.entries(newAnnsByPage)) {
                    const pNum = parseInt(pNumStr, 10);
                    updated[pNum] = [...(updated[pNum] || []), ...pageAnns];
                  }
                  annotationsRef.current = updated;
                  return updated;
                });
                selection.removeAllRanges();
              }
            }
          }
        }, 50);
      }
    };

    document.addEventListener('pointerup', handleTextSelectionPointerUp);
    document.addEventListener('touchend', handleTextSelectionPointerUp);
    return () => {
      document.removeEventListener('pointerup', handleTextSelectionPointerUp);
      document.removeEventListener('touchend', handleTextSelectionPointerUp);
    };
  }, [pdfTool, highlightMode, zoomLevel, highlightColor, pageNumber]);

  // Smooth scroll to page function
  const scrollToPage = useCallback((pg: number) => {
    const el = pageRefs.current[pg];
    if (el) {
      isProgrammaticScrollingRef.current = true;
      setPageNumber(pg);
      onPageChange?.(pg);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        isProgrammaticScrollingRef.current = false;
      }, 700);
    }
  }, [onPageChange]);

  // IntersectionObservers for Lazy Rendering & Active Page Detection
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !numPages) return;

    // 1. Lazy-rendering observer with expanded rootMargin (+600px top and bottom)
    const lazyObserver = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prevSet) => {
          const nextSet = new Set(prevSet);
          let changed = false;
          entries.forEach((entry) => {
            const pgAttr = entry.target.getAttribute('data-page-number');
            if (!pgAttr) return;
            const pgNum = parseInt(pgAttr, 10);
            if (entry.isIntersecting) {
              if (!nextSet.has(pgNum)) {
                nextSet.add(pgNum);
                changed = true;
              }
            } else {
              // Offscreen: unmount canvas (rootMargin: '600px 0px 600px 0px' provides smooth preloading)
              if (nextSet.has(pgNum)) {
                nextSet.delete(pgNum);
                changed = true;
              }
            }
          });
          return changed ? nextSet : prevSet;
        });
      },
      {
        root: container,
        rootMargin: '600px 0px 600px 0px',
        threshold: 0,
      }
    );

    // 2. Dominant active-page observer to detect primary reading page
    const activeObserver = new IntersectionObserver(
      (_entries) => {
        if (isProgrammaticScrollingRef.current) return;
        const containerRect = container.getBoundingClientRect();
        let maxVisibleHeight = 0;
        let dominantPage = pageNumberRef.current;

        for (let p = 1; p <= numPages; p++) {
          const el = pageRefs.current[p];
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const top = Math.max(rect.top, containerRect.top);
          const bottom = Math.min(rect.bottom, containerRect.bottom);
          const visibleH = Math.max(0, bottom - top);
          if (visibleH > maxVisibleHeight) {
            maxVisibleHeight = visibleH;
            dominantPage = p;
          }
        }

        if (dominantPage !== pageNumberRef.current && maxVisibleHeight > 0) {
          setPageNumber(dominantPage);
          onPageChange?.(dominantPage);
        }
      },
      {
        root: container,
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      }
    );

    for (let p = 1; p <= numPages; p++) {
      const el = pageRefs.current[p];
      if (el) {
        lazyObserver.observe(el);
        activeObserver.observe(el);
      }
    }

    return () => {
      lazyObserver.disconnect();
      activeObserver.disconnect();
    };
  }, [numPages, onPageChange]);

  // Auto-flush pending state when user scrolls from Page X to Page Y
  useEffect(() => {
    if (prevActivePageRef.current !== pageNumber) {
      prevActivePageRef.current = pageNumber;
      if (isDirtyRef.current) {
        handleSave(notesRef.current, annotationsRef.current);
      }
    }
  }, [pageNumber]);

  // Debounced auto-save on any dirty mutation
  useEffect(() => {
    if (!isDirtyRef.current) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(timer);
  }, [notes, annotations]);

  // Unload and visibility-change handlers for reliable persistence
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isDirtyRef.current) {
        flushPendingState();
      }
    };
    const handleBeforeUnload = () => {
      if (isDirtyRef.current) {
        flushPendingState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (isDirtyRef.current) {
        flushPendingState();
      }
    };
  }, [flushPendingState]);

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

  const toolsPortal = typeof document !== 'undefined' ? document.getElementById('pdf-tools-portal') : null;

  // Render Toolbar Content (ported or inlined)
  const toolbarContent = (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
      {viewerEngine === 'pdfjs' && (
        <>
          <button
            type="button"
            onClick={() => setPdfTool('pan')}
            className={`p-1.5 rounded-lg transition-all active:scale-[0.98] ${
              pdfTool === 'pan'
                ? 'text-[var(--theme-primary)] bg-[var(--theme-primary)]/20 border border-[var(--theme-primary)]/30'
                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)]'
            }`}
            title="Pan Tool"
            aria-label="Pan Tool"
          >
            <Hand size={16} />
          </button>
          <button
            type="button"
            onClick={() => setPdfTool('cursor')}
            className={`p-1.5 rounded-lg transition-all active:scale-[0.98] ${
              pdfTool === 'cursor'
                ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/30'
                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)]'
            }`}
            title="Pointer Tool"
            aria-label="Pointer Tool"
          >
            <MousePointer2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => setPdfTool('highlight')}
            className={`p-1.5 rounded-lg transition-all active:scale-[0.98] ${
              pdfTool === 'highlight'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'text-[var(--theme-text-muted)] hover:text-yellow-400 hover:bg-[var(--theme-surface)]'
            }`}
            title="Highlighter Tool"
            aria-label="Highlighter Tool"
          >
            <Highlighter size={16} />
          </button>

          <button
            type="button"
            onClick={() => setPdfTool('text')}
            className={`p-1.5 rounded-lg transition-all active:scale-[0.98] ${
              pdfTool === 'text'
                ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/30'
                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)]'
            }`}
            title="Text Note Tool"
            aria-label="Text Note Tool"
          >
            <Type size={16} />
          </button>

          {pdfTool === 'highlight' && (
            <div className="flex items-center gap-1 mx-1 bg-[var(--theme-surface-subtle)] border border-[var(--theme-border)] rounded-lg p-1">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => setHighlightMode((m) => (m === 'box' ? 'text' : 'box'))}
                className={`flex items-center gap-1 px-2 py-0.5 mr-1 rounded border border-[var(--theme-border)] bg-[var(--theme-surface-elevated)] text-xs font-bold text-[var(--theme-text-primary)] transition-all hover:bg-[var(--theme-surface)] active:scale-[0.98]`}
                title={highlightMode === 'box' ? 'Switch to Text Selection Mode' : 'Switch to Box Drawing Mode'}
              >
                {highlightMode === 'box' ? <Square size={12} /> : <Baseline size={12} />}
                <span className="hidden sm:inline">{highlightMode === 'box' ? 'Box' : 'Text'}</span>
              </button>
              {['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => setHighlightColor(c)}
                  className={`w-4 h-4 rounded-full border ${highlightColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'} transition-all`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          {pdfTool === 'text' && (
            <div className="flex items-center gap-1 mx-1 bg-[var(--theme-surface-subtle)] border border-[var(--theme-border)] rounded-lg p-1">
              {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#9333ea', '#ec4899', '#ffffff', '#000000'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setTextColor(c);
                    if (pendingText) setPendingText({ ...pendingText, color: c });
                  }}
                  className={`w-4 h-4 rounded-full border ${textColor === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'} transition-all`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setPdfTool('eraser')}
            className={`p-1.5 rounded-lg transition-all active:scale-[0.98] ${
              pdfTool === 'eraser'
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                : 'text-[var(--theme-text-muted)] hover:text-pink-400 hover:bg-[var(--theme-surface)]'
            }`}
            title="Eraser Tool"
            aria-label="Eraser Tool"
          >
            <Eraser size={16} />
          </button>
          <button
            type="button"
            onClick={handleUndo}
            className="p-1.5 rounded-lg transition-all active:scale-[0.98] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)]"
            title="Undo Annotation"
            aria-label="Undo"
          >
            <Undo2 size={16} />
          </button>
        </>
      )}

      <div className="w-px h-4 bg-[var(--theme-border)] mx-1" />

      <button
        type="button"
        onClick={() => setViewerEngine((v) => (v === 'pdfjs' ? 'native' : 'pdfjs'))}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all active:scale-[0.98] border ${
          viewerEngine === 'native'
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : 'bg-[var(--theme-surface-subtle)] text-[var(--theme-text-secondary)] border-[var(--theme-border)] hover:bg-[var(--theme-surface)] hover:text-[var(--theme-text-primary)]'
        }`}
        title="Toggle PDF Engine (Native Browser vs Interactive)"
      >
        <Eye size={14} />
        <span className="text-xs font-bold hidden sm:inline">{viewerEngine === 'native' ? 'Native' : 'Interactive'}</span>
      </button>

      <div className="w-px h-4 bg-[var(--theme-border)] mx-1" />

      <button
        type="button"
        onClick={() => setShowNotes(!showNotes)}
        className={`p-1.5 rounded-lg transition-all active:scale-[0.98] ${
          showNotes
            ? 'text-[var(--theme-primary)] bg-[var(--theme-primary)]/20 border border-[var(--theme-primary)]/30'
            : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)]'
        }`}
        title="Toggle Notes Panel"
        aria-label="Toggle Notes"
      >
        <Sidebar size={16} />
      </button>

      <div className="w-px h-4 bg-[var(--theme-border)] mx-1" />

      <button
        type="button"
        onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
        className="p-1.5 rounded-lg transition-all active:scale-[0.98] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)]"
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <ZoomOut size={16} />
      </button>
      <div className="text-xs font-mono text-[var(--theme-text-secondary)] font-bold min-w-[36px] text-center">
        {Math.round(zoomLevel * 100)}%
      </div>
      <button
        type="button"
        onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3.0))}
        className="p-1.5 rounded-lg transition-all active:scale-[0.98] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)]"
        title="Zoom In"
        aria-label="Zoom In"
      >
        <ZoomIn size={16} />
      </button>

      <button
        type="button"
        onClick={() => handleSave()}
        disabled={isSaving}
        className={`ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all active:scale-[0.98] text-xs font-bold ${
          saved
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-[var(--theme-primary)] text-white hover:opacity-90'
        }`}
        title="Save Notes and Annotations (Ctrl+S)"
        aria-label="Save"
      >
        {saved ? <Check size={14} /> : <Save size={14} />}
        <span className="hidden sm:inline">{saved ? 'Saved' : isSaving ? 'Saving...' : 'Save'}</span>
      </button>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`flex w-full flex-1 h-full min-h-[500px] border rounded-2xl overflow-hidden shadow-inner flex-col md:flex-row ${
        isDark ? 'border-[var(--theme-border)] bg-[var(--theme-surface)]' : 'border-gray-200 bg-gray-100'
      }`}
    >
      <style>{`
        .react-pdf__Page__textContent {
          line-height: 1 !important;
        }
        .react-pdf__Page__textContent > span {
          line-height: 1 !important;
        }
      `}</style>

      {/* Portal or Fallback Top Toolbar */}
      {toolsPortal ? createPortal(toolbarContent, toolsPortal) : (
        <div className="p-2 border-b border-[var(--theme-border)] bg-[var(--theme-surface)] md:hidden flex justify-center">
          {toolbarContent}
        </div>
      )}

      {/* Main Continuous PDF Scroll Container */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 h-full overflow-y-auto overflow-x-auto custom-scrollbar flex flex-col py-6 px-6 relative bg-black/20 ${
          pdfTool === 'pan' || (pdfTool === 'highlight' && highlightMode === 'box') ? 'touch-none' : ''
        }`}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button, input, select, .pointer-events-auto')) return;
          if (pdfTool === 'pan') {
            e.preventDefault();
            const container = scrollContainerRef.current;
            if (!container) return;
            if (e.pointerId && container.setPointerCapture) container.setPointerCapture(e.pointerId);
            const startX = e.clientX;
            const startY = e.clientY;
            const startScrollLeft = container.scrollLeft;
            const startScrollTop = container.scrollTop;

            const handleMove = (ev: PointerEvent) => {
              container.scrollLeft = startScrollLeft - (ev.clientX - startX);
              container.scrollTop = startScrollTop - (ev.clientY - startY);
            };
            const handleUp = (ev: PointerEvent) => {
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
        {viewerEngine === 'native' ? (
          <iframe
            src={`${pdfUrl}#toolbar=0`}
            className="w-full h-full flex-1 border-0 bg-transparent rounded-xl"
            title="PDF Native Viewer"
          />
        ) : (
          <div className="w-fit mx-auto relative flex flex-col items-center">
            <Document
              file={pdfUrl}
              options={options}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="text-slate-400 font-mono text-sm animate-pulse flex h-full items-center py-12">
                  Loading Document...
                </div>
              }
              className="drop-shadow-2xl flex flex-col items-center"
            >
              {numPages &&
                Array.from({ length: numPages }, (_, index) => {
                  const pg = index + 1;
                  const isRendered = visiblePages.has(pg) || Math.abs(pg - pageNumber) <= 1;
                  const size = pageSizes[pg] || defaultPageSize;
                  const displayWidth = size.width * zoomLevel;
                  const displayHeight = size.height * zoomLevel;

                  return (
                    <div
                      key={`page-container-${pg}`}
                      ref={(el) => {
                        pageRefs.current[pg] = el;
                      }}
                      data-page-number={pg}
                      className="pdf-page-container relative mb-8 shadow-2xl rounded-lg bg-white overflow-hidden transition-all duration-150 transform-gpu"
                      style={{
                        width: `${displayWidth}px`,
                        height: `${displayHeight}px`,
                        minHeight: `${displayHeight}px`,
                        cursor:
                          pdfTool === 'text'
                            ? 'text'
                            : pdfTool === 'highlight' && highlightMode === 'box'
                            ? 'crosshair'
                            : pdfTool === 'eraser'
                            ? 'crosshair'
                            : 'default',
                      }}
                      onPointerDown={(e) => handlePagePointerDown(pg, e)}
                    >
                      {isRendered ? (
                        <RenderedPdfPage
                          pageNumber={pg}
                          zoomLevel={zoomLevel}
                          pdfTool={pdfTool}
                          highlightMode={highlightMode}
                          highlightColor={highlightColor}
                          textColor={textColor}
                          annotations={annotations[pg] || []}
                          activeDrawing={highlightDrawing?.pageNumber === pg ? highlightDrawing : null}
                          pendingText={pendingText?.pageNumber === pg ? pendingText : null}
                          onPageProxyLoaded={handlePageProxyLoaded}
                          onPageDimensionsLoaded={handlePageDimensionsLoaded}
                          onEraseAnnotation={handleEraseAnnotation}
                          onEditTextAnnotation={handleEditTextAnnotation}
                          onCommitPendingText={handleCommitPendingText}
                          setPendingText={setPendingText}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/30 text-zinc-500 font-mono text-sm select-none">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
                            <span>Page {pg}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </Document>
          </div>
        )}

        {/* Floating Bottom Pagination Pill (Continuous Scroll Synced) */}
        {viewerEngine === 'pdfjs' && numPages && (
          <div className="sticky bottom-6 mt-6 left-1/2 -translate-x-1/2 w-max flex items-center gap-3 bg-[var(--theme-surface-elevated)]/90 backdrop-blur-md px-4 py-2 rounded-full border border-[var(--theme-border)] shadow-xl z-50 text-[var(--theme-text-primary)]">
            <button
              type="button"
              onClick={() => scrollToPage(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[var(--theme-text-primary)] disabled:opacity-30 hover:bg-[var(--theme-surface-subtle)] active:scale-95 rounded-full transition-all"
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-2 text-xs tracking-widest font-bold uppercase text-[var(--theme-text-secondary)]">
              <span>Page</span>
              <input
                type="number"
                min={1}
                max={numPages || 1}
                value={pageNumber}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    const clamped = Math.min(Math.max(1, val), numPages || 1);
                    scrollToPage(clamped);
                  }
                }}
                className="w-12 text-center bg-[var(--theme-surface-subtle)] border border-[var(--theme-border)] text-[var(--theme-text-primary)] rounded py-1 outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono"
              />
              <span>/ {numPages}</span>
            </div>

            <button
              type="button"
              onClick={() => scrollToPage(Math.min(numPages || 1, pageNumber + 1))}
              disabled={pageNumber >= (numPages || 1)}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[var(--theme-text-primary)] disabled:opacity-30 hover:bg-[var(--theme-surface-subtle)] active:scale-95 rounded-full transition-all"
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Collapsible / Resizable Right Notepad */}
      {showNotes && (
        <>
          {/* Draggable Resizer */}
          <div
            className="w-2 cursor-col-resize bg-transparent hover:bg-[var(--theme-primary)]/40 active:bg-[var(--theme-primary)] transition-colors z-20 relative flex-shrink-0 group hidden md:block"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            aria-label="Resize Notes Panel"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-10 bg-[var(--theme-border)] group-hover:bg-[var(--theme-primary)] rounded-full transition-colors pointer-events-none" />
          </div>

          {/* Handwriting / Markdown Notes Panel Strictly Bound to activePageNumber */}
          <NotesPanel
            pageNumber={pageNumber}
            notesWidth={notesWidth}
            isDark={isDark}
            initialNote={notes[pageNumber] || { text: '', lang: 'en' }}
            onChange={(pg, noteData) => {
              isDirtyRef.current = true;
              setNotes((prev) => {
                const updated = {
                  ...prev,
                  [pg]: noteData,
                };
                notesRef.current = updated;
                return updated;
              });
            }}
            onDirty={() => {
              isDirtyRef.current = true;
            }}
            onClose={() => setShowNotes(false)}
          />
        </>
      )}
    </div>
  );
}
