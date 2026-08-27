'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PenTool } from 'lucide-react';

export interface NoteData {
  text: string;
  lang: 'en' | 'ar';
}

export interface NotesPanelProps {
  pageNumber: number;
  notesWidth: number;
  isDark?: boolean;
  initialNote?: NoteData;
  onChange: (pageNumber: number, note: NoteData) => void;
  onDirty?: () => void;
}

export const NotesPanel = React.memo(function NotesPanel({
  pageNumber,
  notesWidth,
  isDark = true,
  initialNote,
  onChange,
  onDirty
}: NotesPanelProps) {
  const [localNote, setLocalNote] = useState<NoteData>(() => initialNote || { text: '', lang: 'en' });
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localNoteRef = useRef<NoteData>(localNote);
  localNoteRef.current = localNote;
  const currentPageRef = useRef<number>(pageNumber);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;

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

  return (
    <div
      style={{ width: notesWidth }}
      className={`flex-shrink-0 h-full border-l flex flex-col ${
        isDark ? 'border-slate-800 bg-[#12141c]' : 'border-gray-200 bg-[#fffdf5]'
      }`}
    >
      <div
        className={`p-4 border-b flex justify-between items-center ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-400">
          <PenTool size={14} /> Pg. {pageNumber} Notes
        </div>

        <div className="flex items-center gap-3">
          <select
            value={localNote.lang}
            onChange={handleLangChange}
            className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <option value="en">English (Caveat)</option>
            <option value="ar">عربي (Lemonada)</option>
          </select>
        </div>
      </div>

      <textarea
        value={localNote.text}
        onChange={handleTextChange}
        placeholder="Write your notes here..."
        dir={localNote.lang === 'ar' ? 'rtl' : 'ltr'}
        className={`flex-1 w-full p-8 bg-transparent outline-none resize-none leading-[32px] ${
          localNote.lang === 'ar'
            ? 'font-[family-name:var(--font-lemonada)] text-right text-[1.1rem]'
            : 'font-[family-name:var(--font-caveat)] text-left text-2xl tracking-wide'
        } ${
          isDark
            ? 'text-amber-100/90 placeholder:text-amber-100/20'
            : 'text-slate-800 placeholder:text-slate-300'
        }`}
        style={{
          backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${
            isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(167, 139, 250, 0.3)'
          } 31px, ${
            isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(167, 139, 250, 0.3)'
          } 32px)`,
          backgroundAttachment: 'local'
        }}
      />
    </div>
  );
});

export default NotesPanel;
