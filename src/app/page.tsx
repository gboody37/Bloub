'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, HelpCircle, BookOpen, X, Sparkles, 
  ArrowLeft, Check, Play, Pause, RotateCcw, Flame, Plus,
  FileText
} from 'lucide-react';
import CozyBooksAndNotes, { type StudyItem, INITIAL_STUDY_ITEMS } from '@/components/study/CozyBooksAndNotes';
import CozyParchmentReader from '@/components/study/CozyParchmentReader';
import CozyStudyNotepad from '@/components/study/CozyStudyNotepad';
import NoteViewer from '@/components/study/NoteViewer';
import type { ParsedObsidianNote } from '@/types/obsidian';

export default function BloubHome() {
  // Active study item
  const [activeItem, setActiveItem] = useState<StudyItem>(INITIAL_STUDY_ITEMS[0]);
  
  // Pomodoro & Streak State
  const [pomodoroSeconds, setPomodoroSeconds] = useState(24 * 60 + 18);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [streakDays, setStreakDays] = useState(4);
  const [pomodoroSession, setPomodoroSession] = useState(3);
  
  // Full Reader Mode for specific notes
  const [fullViewNote, setFullViewNote] = useState<ParsedObsidianNote | null>(null);

  // Modals
  const [showHelp, setShowHelp] = useState(false);
  const [mobileTab, setMobileTab] = useState<'library' | 'reader' | 'notepad'>('library');

  // Pomodoro countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && pomodoroSeconds > 0) {
      interval = setInterval(() => {
        setPomodoroSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, pomodoroSeconds]);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Theme: Amber (#141211) vs Matcha (#101412)
  const [bgTheme, setBgTheme] = useState<'bg-[#141211]' | 'bg-[#101412]'>('bg-[#141211]');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem('bloub_theme');
        if (savedTheme === 'bg-[#101412]' || savedTheme === 'bg-[#141211]') {
          setBgTheme(savedTheme as any);
        }
      } catch {}
    }
  }, []);

  const toggleTheme = () => {
    const next = bgTheme === 'bg-[#141211]' ? 'bg-[#101412]' : 'bg-[#141211]';
    setBgTheme(next);
    try {
      localStorage.setItem('bloub_theme', next);
    } catch {}
  };

  const isMatcha = bgTheme === 'bg-[#101412]';

  // Convert active study item to ParsedObsidianNote for Parchment reader
  const currentParsedNote: ParsedObsidianNote = useMemo(() => ({
    id: activeItem.id,
    title: activeItem.title,
    relativePath: activeItem.title,
    absolutePath: activeItem.title,
    folder: activeItem.folder || 'Physics',
    frontmatter: {
      tags: activeItem.tags || []
    },
    bodyContent: activeItem.content || '',
    rawContent: activeItem.content || '',
    wikilinks: [],
    tags: activeItem.tags || [],
    headings: [],
    wordCount: activeItem.wordCount || 0,
    lastModifiedMs: Date.now(),
    stats: {
      wordCount: activeItem.wordCount || 0,
      characterCount: activeItem.content?.length || 0,
      lineCount: 0
    }
  }), [activeItem]);

  return (
    <div className={`min-h-screen w-full ${bgTheme} transition-colors duration-500 font-sans text-stone-100 flex flex-col`}>
      <main className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 mx-auto flex-1 flex flex-col relative py-4">
        
        {/* Header (No Companion Editor) */}
        {!fullViewNote && (
          <header className="pt-2 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none border-b border-stone-800/40 mb-3">
            {/* Left: Brand with active book breadcrumb */}
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setFullViewNote(null)}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black text-xl group-hover:scale-105 transition-transform">
                  (
                </div>
                <span className="text-xl font-bold tracking-tight text-[#f5efe6] font-sans">
                  Bloub
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400 font-medium pl-2 border-l border-stone-800">
                <span className="hover:text-stone-300 cursor-pointer">{activeItem.folder || 'Physics'}</span>
                <span className="text-stone-600">›</span>
                <span className="text-amber-400/90 truncate max-w-[240px]">{activeItem.title}</span>
              </div>
            </div>

            {/* Center: Interactive Mascot Status & Pomodoro Island */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1c1714] border border-[#332a22] shadow-lg text-xs">
                <div className="flex items-center gap-1.5 pr-2 border-r border-stone-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-stone-200">
                    Bloub is studying
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-1 font-mono font-bold text-amber-400">
                  <span>{formatTimer(pomodoroSeconds)}</span>
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="p-1 rounded-full hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
                    title={isTimerRunning ? 'Pause timer' : 'Start timer'}
                  >
                    {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      setPomodoroSeconds(25 * 60);
                    }}
                    className="p-1 rounded-full hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors"
                    title="Reset timer"
                  >
                    <RotateCcw size={11} />
                  </button>
                </div>

                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-[10px] text-stone-400">
                  Session {pomodoroSession}/4
                </span>
              </div>
            </div>

            {/* Right: Streak & Utility Actions (NO COMPANION EDITING) */}
            <div className="flex items-center gap-2 justify-end">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 select-none">
                <Flame size={14} className="text-amber-500 fill-amber-500" />
                <span>{streakDays} Days</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileTab('notepad');
                  const notepadEl = document.querySelector('textarea');
                  if (notepadEl) notepadEl.focus();
                }}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all active:scale-[0.98] shadow-sm"
              >
                <Plus size={13} />
                <span>New Note</span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900/60 border border-transparent hover:border-stone-800 transition-colors"
                title="Switch Theme: Amber / Matcha"
              >
                <Users size={14} />
              </button>

              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900/60 border border-transparent hover:border-stone-800 transition-colors"
                title="Help & Shortcuts"
              >
                <HelpCircle size={14} />
              </button>
            </div>
          </header>
        )}

        {/* Full Note / Book Reader Mode */}
        {fullViewNote ? (
          <div className="flex-1 flex flex-col h-full min-h-0 py-2">
            <div className="flex items-center justify-between pb-3 mb-2 px-1">
              <button
                type="button"
                onClick={() => setFullViewNote(null)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#241e1a] border border-[#382f28] text-xs font-semibold text-stone-300 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Study Workspace</span>
              </button>
              <span className="text-xs text-stone-400 font-mono truncate max-w-sm">
                {fullViewNote.title}
              </span>
            </div>
            <div className="flex-1 rounded-[28px] overflow-hidden border border-[#2e2620] bg-[#181412] shadow-2xl min-h-[620px] flex flex-col">
              <NoteViewer
                note={fullViewNote}
                onClose={() => setFullViewNote(null)}
                isDark={true}
              />
            </div>
          </div>
        ) : (
          /* Pure 3-Column Study Workspace (Zero Todo Residues) */
          <div className="flex-1 flex flex-col mb-4 mt-2">
            {/* Desktop (1024px+): 3-Column Equal Grid */}
            <div className="hidden lg:grid grid-cols-3 gap-6 items-stretch min-h-[620px]">
              {/* Column 1: Books & Notes Library */}
              <div className="col-span-1 h-full">
                <CozyBooksAndNotes
                  activeItemId={activeItem.id}
                  onSelectItem={(item) => {
                    setActiveItem(item);
                  }}
                  isMatcha={isMatcha}
                />
              </div>

              {/* Column 2: Reading Sheet / Active Document */}
              <div className="col-span-1 h-full">
                <CozyParchmentReader
                  note={currentParsedNote}
                  onOpenVault={() => setFullViewNote(currentParsedNote)}
                  isMatcha={isMatcha}
                />
              </div>

              {/* Column 3: Live Study Notepad */}
              <div className="col-span-1 h-full">
                <CozyStudyNotepad
                  isMatcha={isMatcha}
                  activeNoteTitle={activeItem.title}
                />
              </div>
            </div>

            {/* Mobile / Tablet View (< 1024px) */}
            <div className="flex lg:hidden flex-col gap-4">
              <div className="flex items-center justify-center p-1 rounded-2xl bg-[#1c1917] border border-stone-800">
                <button
                  type="button"
                  onClick={() => setMobileTab('library')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    mobileTab === 'library' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400'
                  }`}
                >
                  Books & Notes
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('reader')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    mobileTab === 'reader' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400'
                  }`}
                >
                  Reading Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('notepad')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    mobileTab === 'notepad' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400'
                  }`}
                >
                  Notepad
                </button>
              </div>

              <div className="min-h-[540px]">
                {mobileTab === 'library' && (
                  <CozyBooksAndNotes
                    activeItemId={activeItem.id}
                    onSelectItem={(item) => {
                      setActiveItem(item);
                      setMobileTab('reader');
                    }}
                    isMatcha={isMatcha}
                  />
                )}
                {mobileTab === 'reader' && (
                  <div className="h-[560px]">
                    <CozyParchmentReader
                      note={currentParsedNote}
                      onOpenVault={() => setFullViewNote(currentParsedNote)}
                      isMatcha={isMatcha}
                    />
                  </div>
                )}
                {mobileTab === 'notepad' && (
                  <div className="h-[560px]">
                    <CozyStudyNotepad
                      isMatcha={isMatcha}
                      activeNoteTitle={activeItem.title}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Help Modal */}
      {showHelp && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <div 
            className="bg-[#181412] border border-[#2e2620] rounded-[28px] p-6 max-w-sm w-full shadow-2xl animate-pop-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2e2620]">
              <h3 className="text-base font-bold text-[#f5efe6]">Study Shortcuts</h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 rounded-full bg-[#241e1a] border border-[#382f28] flex items-center justify-center text-stone-400 hover:text-stone-200"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs text-stone-300">
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span>Toggle Pomodoro Timer</span>
                <kbd className="px-2 py-0.5 rounded bg-[#241e1a] font-mono text-[10px] text-amber-400">Click Timer</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span>Select Book / Chapter</span>
                <kbd className="px-2 py-0.5 rounded bg-[#241e1a] font-mono text-[10px] text-amber-400">Column 1 Click</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-800/60">
                <span>Quick Thought Capture</span>
                <kbd className="px-2 py-0.5 rounded bg-[#241e1a] font-mono text-[10px] text-amber-400">Enter in Notepad</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span>Insert Formula</span>
                <kbd className="px-2 py-0.5 rounded bg-[#241e1a] font-mono text-[10px] text-amber-400">+ Insert in Formulas</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}