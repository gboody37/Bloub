'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, HelpCircle, BookOpen, X, Sparkles, 
  ArrowLeft, Check, Play, Pause, RotateCcw, Flame, Plus,
  FileText, Bell, Compass, LayoutGrid, CheckCircle2, ChevronRight
} from 'lucide-react';
import dynamic from 'next/dynamic';
import CozyBooksAndNotes, { type StudyItem, INITIAL_STUDY_ITEMS } from '@/components/study/CozyBooksAndNotes';
import CozyParchmentReader from '@/components/study/CozyParchmentReader';
import CozyStudyNotepad from '@/components/study/CozyStudyNotepad';
import CozyQuizTab from '@/components/study/CozyQuizTab';
import CozyStatsThemesTab from '@/components/study/CozyStatsThemesTab';
import NoteViewer from '@/components/study/NoteViewer';
import type { ParsedObsidianNote } from '@/types/obsidian';

// Dynamic import for PDF Notebook Viewer with Arabic BiDi support
const PdfNotebookViewer = dynamic(() => import('@/components/study/PdfNotebookViewer'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center min-h-[500px] text-stone-400 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      <span className="text-xs font-mono">Loading Arabic PDF Engine...</span>
    </div>
  )
});

type TopTab = 'library' | 'pdf' | 'quiz' | 'stats';

export default function BloubHome() {
  // Navigation Tabs matching Stitch
  const [activeTab, setActiveTab] = useState<TopTab>('library');

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

  // Themes
  const [themeName, setThemeName] = useState('Dark Loft');
  const [bgClass, setBgClass] = useState('bg-[#15161b]');

  const handleThemeChange = (name: string) => {
    setThemeName(name);
    if (name === 'Obsidian Noir') setBgClass('bg-[#0c0d10]');
    else if (name === 'Matcha Garden') setBgClass('bg-[#101f18]');
    else if (name === 'Midnight Abyss') setBgClass('bg-[#0e0f2d]');
    else if (name === 'Warm Sand') setBgClass('bg-[#1e1714]');
    else setBgClass('bg-[#15161b]');
    try {
      localStorage.setItem('bloub_theme_name', name);
    } catch {}
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bloub_theme_name');
        if (saved) handleThemeChange(saved);
      } catch {}
    }
  }, []);

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

  // Convert active study item to ParsedObsidianNote for Parchment reader
  const currentParsedNote: ParsedObsidianNote = useMemo(() => ({
    id: activeItem.id,
    title: activeItem.title,
    relativePath: activeItem.title,
    absolutePath: activeItem.title,
    folder: activeItem.folder || 'Physics 12',
    frontmatter: {
      tags: activeItem.tags || [],
      pdf_url: activeItem.pdfUrl
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
    <div className={`min-h-screen w-full ${bgClass} transition-colors duration-500 font-sans text-stone-100 flex flex-col`}>
      <main className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 mx-auto flex-1 flex flex-col relative py-3">
        
        {/* Top Bar matching user reference & Stitch Design */}
        {!fullViewNote && (
          <header className="pt-2 pb-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 select-none border-b border-stone-800/40 mb-4">
            
            {/* Left: Fixed Logo & Breadcrumb */}
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center gap-2.5 cursor-pointer group"
                onClick={() => {
                  setActiveTab('library');
                  setFullViewNote(null);
                }}
              >
                {/* Fixed Sleek Bloub Logo Mark (No parenthesis) */}
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" />
                    <circle cx="9" cy="10" r="1.5" fill="currentColor" />
                    <circle cx="15" cy="10" r="1.5" fill="currentColor" />
                    <path d="M10 14C10.5 15.2 11.5 15.8 12 15.8C12.5 15.8 13.5 15.2 14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-tight text-[#f5efe6]">
                  Bloub
                </span>
              </div>

              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400 font-medium pl-2.5 border-l border-stone-800">
                <span 
                  onClick={() => setActiveTab('library')}
                  className="hover:text-stone-300 cursor-pointer"
                >
                  Workspace
                </span>
                <span className="text-stone-600">›</span>
                <span className="text-amber-400/90 truncate max-w-[220px]">
                  {activeTab === 'library' ? activeItem.title : activeTab === 'pdf' ? 'Modern Physics PDF' : activeTab === 'quiz' ? 'Chapter 4 Quiz' : 'Settings & Themes'}
                </span>
              </div>
            </div>

            {/* Center: Top Navigation Tabs + Mascot Status Pill */}
            <div className="flex items-center gap-3 justify-center flex-wrap">
              {/* Navigation Tabs */}
              <nav className="flex items-center p-1 rounded-full bg-[#1b1714] border border-[#2e251e] shadow-inner text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('library')}
                  className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                    activeTab === 'library'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Library
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('pdf')}
                  className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                    activeTab === 'pdf'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  PDF Reader
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('quiz')}
                  className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                    activeTab === 'quiz'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Quiz
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('stats')}
                  className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                    activeTab === 'stats'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Stats & Themes
                </button>
              </nav>

              {/* Exact Status Pill matching user screenshot */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1c1714] border border-[#332a22] shadow-lg text-xs">
                <div className="flex items-center gap-1.5 pr-2 border-r border-stone-800">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
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
                    {isTimerRunning ? <Pause size={11} /> : <Play size={11} />}
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
                    <RotateCcw size={10} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Streak & Utility Actions (Zero Emojis!) */}
            <div className="flex items-center gap-2.5 justify-end">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 select-none">
                <Flame size={14} className="text-amber-500 fill-amber-500" />
                <span>{streakDays} Days</span>
              </div>

              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-stone-900/60 border border-transparent hover:border-stone-800 transition-colors"
                title="Shortcuts & Info"
              >
                <HelpCircle size={15} />
              </button>

              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-300">
                G
              </div>
            </div>
          </header>
        )}

        {/* Tab Views */}
        {activeTab === 'library' && (
          fullViewNote ? (
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
            /* 3-Column Workspace */
            <div className="flex-1 flex flex-col mb-4">
              <div className="hidden lg:grid grid-cols-3 gap-5 items-stretch min-h-[620px]">
                {/* Column 1: Books & Notes Library */}
                <div className="col-span-1 h-full">
                  <CozyBooksAndNotes
                    activeItemId={activeItem.id}
                    onSelectItem={(item) => setActiveItem(item)}
                    isMatcha={themeName === 'Matcha Garden'}
                  />
                </div>

                {/* Column 2: Reading Sheet / Active Document */}
                <div className="col-span-1 h-full">
                  <CozyParchmentReader
                    note={currentParsedNote}
                    onOpenVault={() => setFullViewNote(currentParsedNote)}
                    isMatcha={themeName === 'Matcha Garden'}
                  />
                </div>

                {/* Column 3: Live Study Notepad */}
                <div className="col-span-1 h-full">
                  <CozyStudyNotepad
                    isMatcha={themeName === 'Matcha Garden'}
                    activeNoteTitle={activeItem.title}
                  />
                </div>
              </div>

              {/* Mobile (< 1024px) */}
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
                      isMatcha={themeName === 'Matcha Garden'}
                    />
                  )}
                  {mobileTab === 'reader' && (
                    <div className="h-[560px]">
                      <CozyParchmentReader
                        note={currentParsedNote}
                        onOpenVault={() => setFullViewNote(currentParsedNote)}
                        isMatcha={themeName === 'Matcha Garden'}
                      />
                    </div>
                  )}
                  {mobileTab === 'notepad' && (
                    <div className="h-[560px]">
                      <CozyStudyNotepad
                        isMatcha={themeName === 'Matcha Garden'}
                        activeNoteTitle={activeItem.title}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {/* PDF Reader Tab (Stitch Screen 2: Continuous scroll, Arabic text layer, highlighter box, text box, and per-page notes) */}
        {activeTab === 'pdf' && (
          <div className="flex-1 flex flex-col min-h-[680px] rounded-3xl overflow-hidden border border-[#2d241d] bg-[#181412] shadow-2xl p-2 sm:p-4">
            <PdfNotebookViewer
              pdfUrl={activeItem.pdfUrl || 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf'}
              noteId={activeItem.id}
              notePath={activeItem.title}
              isDark={true}
            />
          </div>
        )}

        {/* Quiz Tab (Stitch Screen 3: Bilingual questions, LaTeX derivations, instant feedback, question navigator) */}
        {activeTab === 'quiz' && (
          <CozyQuizTab />
        )}

        {/* Stats & Themes Tab (Stitch Screen 4: 4 textbooks, focus hours, streak, quiz mastery, scholar level, theme swatches, companion presence) */}
        {activeTab === 'stats' && (
          <CozyStatsThemesTab
            activeTheme={themeName}
            onThemeChange={handleThemeChange}
            onSelectBook={(title) => {
              const matched = INITIAL_STUDY_ITEMS.find(i => i.title.includes(title) || title.includes(i.title));
              if (matched) {
                setActiveItem(matched);
                setActiveTab('library');
              }
            }}
          />
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