'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PenTool, 
  BookOpen, 
  Highlighter, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2
} from 'lucide-react';

export interface NoteData {
  text: string;
  lang: 'en' | 'ar';
}

export type NotesPanelState = 'expanded' | 'rail' | 'drawer';

export interface NotesPanelProps {
  pageNumber: number;
  notesWidth: number;
  isDark?: boolean;
  initialNote?: NoteData;
  onChange: (pageNumber: number, note: NoteData) => void;
  onDirty?: () => void;
  panelMode?: NotesPanelState;
  onToggleMode?: (mode: NotesPanelState) => void;
  onSelectNote?: (pageNumber: number) => void;
  onOpenChapters?: () => void;
  onOpenAnnotations?: () => void;
  onOpenAiSummary?: () => void;
  onClose?: () => void;
}

export const NotesPanel = React.memo(function NotesPanel({
  pageNumber,
  notesWidth,
  isDark = true,
  initialNote,
  onChange,
  onDirty,
  panelMode = 'expanded',
  onToggleMode,
  onSelectNote,
  onOpenChapters,
  onOpenAnnotations,
  onOpenAiSummary,
  onClose
}: NotesPanelProps) {
  const [localNote, setLocalNote] = useState<NoteData>(() => initialNote || { text: '', lang: 'en' });
  const [panelState, setPanelState] = useState<NotesPanelState>(panelMode);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localNoteRef = useRef<NoteData>(localNote);
  localNoteRef.current = localNote;
  const currentPageRef = useRef<number>(pageNumber);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;

  // Track responsive screen size for auto-hide drawer
  useEffect(() => {
    const checkViewport = () => {
      const isNarrow = window.innerWidth < 1024;
      setIsMobileOrTablet(isNarrow);
      if (isNarrow && panelState === 'expanded' && !panelMode) {
        setPanelState('rail');
      }
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, [panelMode, panelState]);

  // Sync panelMode prop if provided
  useEffect(() => {
    if (panelMode) {
      setPanelState(panelMode);
    }
  }, [panelMode]);

  const updatePanelState = (newState: NotesPanelState) => {
    setPanelState(newState);
    onToggleMode?.(newState);
  };

  // Sync external initialNote when pageNumber changes or when external note text resets
  useEffect(() => {
    // If switching page, immediately flush pending changes for previous page
    if (currentPageRef.current !== pageNumber) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
        onChangeRef.current(currentPageRef.current, localNoteRef.current);
      }
      currentPageRef.current = pageNumber;
      const nextNote = initialNote || { text: '', lang: 'en' };
      setLocalNote(nextNote);
      localNoteRef.current = nextNote;
    } else {
      // Same page: only update if remote differs and we don't have an active local debounce timer
      if (!debounceTimerRef.current && initialNote) {
        if (initialNote.text !== localNoteRef.current.text || initialNote.lang !== localNoteRef.current.lang) {
          setLocalNote(initialNote);
          localNoteRef.current = initialNote;
        }
      }
    }
  }, [pageNumber, initialNote]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
        onChangeRef.current(currentPageRef.current, localNoteRef.current);
      }
    };
  }, []);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const updated: NoteData = { ...localNoteRef.current, text: newText };
    setLocalNote(updated);
    localNoteRef.current = updated;

    onDirtyRef.current?.();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      onChangeRef.current(currentPageRef.current, localNoteRef.current);
    }, 500);
  }, []);

  const handleLangChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as 'en' | 'ar';
    const updated: NoteData = { ...localNoteRef.current, lang: newLang };
    setLocalNote(updated);
    localNoteRef.current = updated;

    onDirtyRef.current?.();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    onChangeRef.current(currentPageRef.current, updated);
  }, []);

  const handleBlur = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      onChangeRef.current(currentPageRef.current, localNoteRef.current);
    }
  }, []);

  // Safe clamped width between 240px and 650px
  const clampedWidth = Math.max(240, Math.min(notesWidth || 450, 650));
  const hasPageNotes = localNote.text.trim().length > 0;

  // STATE 2: COMPACT ICON RAIL (w-12 / 48px)
  if (panelState === 'rail') {
    return (
      <div
        className={`w-12 flex-shrink-0 h-full border-l flex flex-col items-center py-4 justify-between transition-all duration-200 z-10 ${
          isDark
            ? 'border-[var(--theme-border)] bg-[var(--theme-surface)] backdrop-blur-xl'
            : 'border-gray-200 bg-[#fffdf5]'
        }`}
        data-spatial-container="notes-rail"
      >
        {/* Top: Expand Toggle & Page Indicator */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => updatePanelState(isMobileOrTablet ? 'drawer' : 'expanded')}
            className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-all active:scale-[0.98] ${
              isDark
                ? 'text-[var(--theme-primary)] hover:bg-[var(--theme-surface-elevated)] hover:text-white'
                : 'text-purple-600 hover:bg-purple-100'
            }`}
            title="Expand Notebook (Click to write)"
            aria-label="Expand Notes"
          >
            <PanelRightOpen size={18} />
          </button>

          <div
            className={`flex flex-col items-center text-[10px] font-mono font-bold tracking-tighter ${
              isDark ? 'text-[var(--theme-text-muted)]' : 'text-gray-500'
            }`}
          >
            <span>P.{pageNumber}</span>
            {hasPageNotes && (
              <span
                className="w-2 h-2 rounded-full mt-1 bg-[var(--theme-primary)] shadow-sm animate-pulse"
                title="Notes on this page"
              />
            )}
          </div>
        </div>

        {/* Middle: Quick-Access Action Icons */}
        <div className="flex flex-col items-center gap-2">
          {/* Quick Chapters / Outline */}
          <button
            type="button"
            onClick={() => {
              onOpenChapters?.();
              updatePanelState(isMobileOrTablet ? 'drawer' : 'expanded');
            }}
            className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-all active:scale-[0.98] ${
              isDark
                ? 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-elevated)]'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Chapters & Outline"
            aria-label="Chapters"
          >
            <BookOpen size={16} />
          </button>

          {/* Quick Annotations */}
          <button
            type="button"
            onClick={() => {
              onOpenAnnotations?.();
              updatePanelState(isMobileOrTablet ? 'drawer' : 'expanded');
            }}
            className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-all active:scale-[0.98] ${
              isDark
                ? 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-elevated)]'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Annotations"
            aria-label="Annotations"
          >
            <Highlighter size={16} />
          </button>

          {/* Quick AI Summary */}
          <button
            type="button"
            onClick={() => {
              onOpenAiSummary?.();
              updatePanelState(isMobileOrTablet ? 'drawer' : 'expanded');
            }}
            className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-all active:scale-[0.98] ${
              isDark
                ? 'text-[var(--theme-primary)] hover:bg-[var(--theme-surface-elevated)]'
                : 'text-purple-600 hover:bg-purple-100'
            }`}
            title="AI Summary & Insights"
            aria-label="AI Summary"
          >
            <Sparkles size={16} />
          </button>
        </div>

        {/* Bottom: Font Mode / Quick Select */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => updatePanelState(isMobileOrTablet ? 'drawer' : 'expanded')}
            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border transition-all ${
              isDark
                ? 'border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:border-[var(--theme-primary)]'
                : 'border-gray-200 text-gray-700'
            }`}
            title={localNote.lang === 'ar' ? 'عربي (Lemonada)' : 'English (Caveat)'}
          >
            {localNote.lang === 'ar' ? 'ع' : 'En'}
          </button>
        </div>
      </div>
    );
  }

  // Common Notebook Content Renderer
  const notebookBody = (
    <>
      <div
        className={`p-4 border-b flex justify-between items-center transition-colors duration-200 shrink-0 ${
          isDark ? 'border-[var(--theme-border)] bg-[var(--theme-surface-elevated)]' : 'border-gray-200 bg-white'
        }`}
      >
        <div
          className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${
            isDark ? 'text-[var(--theme-primary)]' : 'text-purple-600'
          }`}
        >
          <PenTool size={14} />
          <span
            className="cursor-pointer hover:underline"
            onClick={() => onSelectNote?.(pageNumber)}
          >
            Pg. {pageNumber} Notes
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={localNote.lang}
            onChange={handleLangChange}
            className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${
              isDark
                ? 'bg-[var(--theme-surface-subtle)] border-[var(--theme-border)] text-[var(--theme-text-secondary)] focus:border-[var(--theme-primary)]'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <option value="en">English (Caveat)</option>
            <option value="ar">عربي (Lemonada)</option>
          </select>

          {/* Collapse to Rail Button */}
          <button
            type="button"
            onClick={() => updatePanelState('rail')}
            className={`min-w-[32px] min-h-[32px] p-1.5 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center ${
              isDark
                ? 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface-subtle)]'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
            title="Collapse to Rail"
            aria-label="Collapse to Rail"
          >
            <PanelRightClose size={16} />
          </button>
        </div>
      </div>

      <textarea
        value={localNote.text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder="Write your notes here..."
        dir={localNote.lang === 'ar' ? 'rtl' : 'ltr'}
        className={`flex-1 w-full p-8 bg-transparent outline-none resize-none leading-[32px] ${
          localNote.lang === 'ar'
            ? 'font-[family-name:var(--font-lemonada)] text-right text-[1.1rem]'
            : 'font-[family-name:var(--font-caveat)] text-left text-2xl tracking-wide'
        } ${
          isDark
            ? 'text-[var(--theme-text-primary)] placeholder:[var(--theme-text-muted)]'
            : 'text-slate-800 placeholder:text-slate-300'
        }`}
        style={{
          backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${
            isDark ? 'var(--theme-border-subtle)' : 'rgba(167, 139, 250, 0.3)'
          } 31px, ${
            isDark ? 'var(--theme-border-subtle)' : 'rgba(167, 139, 250, 0.3)'
          } 32px)`,
          backgroundAttachment: 'local'
        }}
      />
    </>
  );

  // STATE 3: AUTO-HIDE DRAWER (Tablet & Mobile Overlay Mode)
  if (panelState === 'drawer') {
    return (
      <>
        {/* Backdrop Overlay */}
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
          onClick={() => updatePanelState('rail')}
        />

        {/* Slide-in Drawer Container */}
        <aside
          className={`fixed inset-y-0 right-0 z-50 w-[88vw] max-w-[440px] h-full shadow-2xl border-l flex flex-col transition-all duration-300 animate-in slide-in-from-right ${
            isDark
              ? 'border-[var(--theme-border)] bg-[var(--theme-surface)] backdrop-blur-2xl'
              : 'border-gray-200 bg-[#fffdf5]'
          }`}
          data-spatial-container="notes-drawer"
        >
          {notebookBody}
        </aside>
      </>
    );
  }

  // STATE 1: EXPANDED (Default Resizable Desktop State)
  return (
    <div
      style={{ width: clampedWidth }}
      className={`flex-shrink-0 h-full border-l flex flex-col transition-colors duration-200 ${
        isDark
          ? 'border-[var(--theme-border)] bg-[var(--theme-surface)] backdrop-blur-xl'
          : 'border-gray-200 bg-[#fffdf5]'
      }`}
      data-spatial-container="notes-expanded"
    >
      {notebookBody}
    </div>
  );
});

export default NotesPanel;
