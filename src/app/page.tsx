'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  HelpCircle, 
  BookOpen, 
  X, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  Flame, 
  FileText, 
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  UploadCloud,
  RotateCw
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { type StudyItem, INITIAL_STUDY_ITEMS } from '@/components/study/CozyBooksAndNotes';
import NoteExplorer from '@/components/study/NoteExplorer';
import CozyQuizTab from '@/components/study/CozyQuizTab';
import CozyStatsThemesTab from '@/components/study/CozyStatsThemesTab';
import type { ObsidianNoteSummary } from '@/types/obsidian';

// Dynamic import for PDF Notebook Viewer with continuous scrolling & Arabic BiDi support
const PdfNotebookViewer = dynamic(() => import('@/components/study/PdfNotebookViewer'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center min-h-[500px] text-zinc-400 gap-3 bg-zinc-950">
      <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      <span className="text-xs font-mono text-zinc-400">Loading Continuous PDF Engine...</span>
    </div>
  )
});

type TopTab = 'library' | 'pdf' | 'quiz' | 'stats';

export default function BloubHome() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<TopTab>('library');

  // Active study item
  const [activeItem, setActiveItem] = useState<StudyItem>(INITIAL_STUDY_ITEMS[0]);
  
  // Library Sidebar Collapsible State
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);

  // Pomodoro & Streak State
  const [pomodoroSeconds, setPomodoroSeconds] = useState(24 * 60 + 18);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [streakDays, setStreakDays] = useState(4);
  
  // Modals
  const [showHelp, setShowHelp] = useState(false);

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

  const handleSelectNote = useCallback(async (noteSummary: ObsidianNoteSummary) => {
    // Check if it matches an existing study item
    const existing = INITIAL_STUDY_ITEMS.find(i => i.id === noteSummary.id || i.title === noteSummary.title);
    if (existing) {
      setActiveItem(existing);
      return;
    }

    // Query note details from API route
    try {
      const res = await fetch(`/api/obsidian/note?path=${encodeURIComponent(noteSummary.relativePath || noteSummary.title)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.note) {
          const n = data.note;
          const pdfUrl = n.frontmatter?.pdf_url || (n.title.toLowerCase().endsWith('.pdf') ? `/api/obsidian/read?file=${encodeURIComponent(n.relativePath)}` : undefined);
          setActiveItem({
            id: n.id,
            title: n.title,
            type: pdfUrl ? 'pdf' : 'note',
            folder: n.folder || noteSummary.folder,
            tags: n.tags || [],
            wordCount: n.wordCount,
            content: n.bodyContent || n.rawContent || '',
            pdfUrl: pdfUrl
          });
          return;
        }
      }
    } catch (err) {
      console.warn('Could not fetch note details:', err);
    }

    // Fallback item from summary
    setActiveItem({
      id: noteSummary.id,
      title: noteSummary.title,
      type: noteSummary.title.toLowerCase().endsWith('.pdf') ? 'pdf' : 'note',
      folder: noteSummary.folder,
      tags: noteSummary.tags || [],
      wordCount: noteSummary.wordCount,
      content: ''
    });
  }, []);

  return (
    <div className={`h-screen h-[100dvh] w-full ${bgClass} transition-colors duration-500 font-sans text-stone-100 flex flex-col overflow-hidden`}>
      {/* Top Navigation Bar */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between gap-3 select-none border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md shrink-0 z-30">
        {/* Left: Sleek Bloub Logo & Breadcrumb */}
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => setActiveTab('library')}
          >
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

          {/* Breadcrumb with clean Lucide ChevronRight */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400 font-medium pl-2.5 border-l border-zinc-800">
            <span 
              onClick={() => setActiveTab('library')}
              className="hover:text-stone-300 cursor-pointer"
            >
              Workspace
            </span>
            <ChevronRight size={12} className="text-zinc-600 shrink-0" />
            <span className="text-amber-400/90 truncate max-w-[200px] sm:max-w-[280px]">
              {activeTab === 'library' || activeTab === 'pdf' ? activeItem.title : activeTab === 'quiz' ? 'Study Quiz' : 'Settings & Themes'}
            </span>
          </div>
        </div>

        {/* Center: Top Navigation Tabs + Mascot Status Pill */}
        <div className="flex items-center gap-3 justify-center">
          <nav className="flex items-center p-1 rounded-full bg-zinc-900 border border-zinc-800 shadow-inner text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                activeTab === 'library' || activeTab === 'pdf'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Reader &amp; Library
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
              Stats &amp; Themes
            </button>
          </nav>

          {/* Status Pill with countdown timer */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 shadow-lg text-xs">
            <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-800">
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
                className="p-1 rounded-full hover:bg-zinc-800 text-stone-300 hover:text-white transition-colors"
                title={isTimerRunning ? 'Pause timer' : 'Start timer'}
                aria-label={isTimerRunning ? 'Pause timer' : 'Start timer'}
              >
                {isTimerRunning ? <Pause size={11} /> : <Play size={11} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTimerRunning(false);
                  setPomodoroSeconds(25 * 60);
                }}
                className="p-1 rounded-full hover:bg-zinc-800 text-stone-500 hover:text-stone-300 transition-colors"
                title="Reset timer"
                aria-label="Reset timer"
              >
                <RotateCcw size={10} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Streak & Utility Actions (Zero Emojis!) */}
        <div className="flex items-center gap-2.5 justify-end">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 select-none">
            <Flame size={14} className="text-amber-500 fill-amber-500" />
            <span>{streakDays} Days</span>
          </div>

          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
            title="Shortcuts & Info"
            aria-label="Shortcuts & Info"
          >
            <HelpCircle size={15} />
          </button>

          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-300">
            G
          </div>
        </div>
      </header>

      {/* Main Full-Height Study Workspace (Tri-Pane Split Reader) */}
      {(activeTab === 'library' || activeTab === 'pdf') && (
        <div className="flex-1 h-full min-h-0 w-full flex overflow-hidden relative">
          
          {/* PANE 1 (LEFT): Sleek Collapsible Authentic Library */}
          <aside 
            className={`${
              isLibraryCollapsed ? 'w-12' : 'w-72 sm:w-80'
            } h-full border-r border-zinc-800 bg-zinc-950 flex flex-col flex-shrink-0 transition-all duration-200 z-10 select-none`}
          >
            {!isLibraryCollapsed ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="h-12 border-b border-zinc-800 px-3.5 flex items-center justify-between gap-2 shrink-0 bg-zinc-900/60">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-amber-400 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                      Study Library
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLibraryCollapsed(true)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
                    title="Collapse Library"
                    aria-label="Collapse Library"
                  >
                    <PanelLeftClose size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden p-3">
                  <NoteExplorer
                    selectedNoteId={activeItem.id}
                    onSelectNote={handleSelectNote}
                    isDark={true}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-3 gap-3 h-full">
                <button
                  type="button"
                  onClick={() => setIsLibraryCollapsed(false)}
                  className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-all active:scale-95 border border-zinc-800"
                  title="Expand Library"
                  aria-label="Expand Library"
                >
                  <PanelLeftOpen size={16} />
                </button>

                <div className="w-6 h-px bg-zinc-800 my-1" />

                <button
                  type="button"
                  onClick={() => setIsLibraryCollapsed(false)}
                  className="w-8 h-8 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center transition-all active:scale-95"
                  title="Upload PDF to Library"
                  aria-label="Upload PDF"
                >
                  <UploadCloud size={16} />
                </button>

                <div className="flex-1" />

                <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 select-none pb-2">
                  LIBRARY
                </div>
              </div>
            )}
          </aside>

          {/* PANE 2 (CENTER) & PANE 3 (RIGHT): Full-Height Reading Canvas + Integrated Portal Header + Page-Synchronized Notes */}
          <section className="flex-1 h-full min-w-0 flex flex-col relative bg-zinc-950 overflow-hidden">
            {/* Integrated Header hosting Document Title & #pdf-tools-portal */}
            <header className="h-12 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 shrink-0 z-20 select-none">
              {/* Left: Active Document Title & Badges */}
              <div className="flex items-center gap-2 min-w-0">
                {isLibraryCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsLibraryCollapsed(false)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shrink-0"
                    title="Open Library"
                    aria-label="Open Library"
                  >
                    <PanelLeftOpen size={16} />
                  </button>
                )}
                <FileText size={15} className="text-amber-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-zinc-100 truncate max-w-[140px] sm:max-w-xs md:max-w-sm tracking-tight" title={activeItem.title}>
                  {activeItem.title}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold uppercase shrink-0">
                  {activeItem.pdfUrl ? 'PDF' : 'NOTE'}
                </span>
              </div>

              {/* Center: Essential #pdf-tools-portal Container hosting Pan, Highlighter, Text, Eraser, Undo, Zoom & Notes toggle */}
              <div id="pdf-tools-portal" className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar"></div>

              {/* Right: Quick Action Shortcuts */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('quiz')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition-all active:scale-95"
                  title="Start AI Quiz on this Document"
                >
                  <Sparkles size={13} />
                  <span className="hidden md:inline">Quiz</span>
                </button>
              </div>
            </header>

            {/* Viewport: Continuous Multi-Page Scrolling PDF Reader with Right-Hand NotesPanel */}
            <div className="flex-1 h-full min-h-0 relative overflow-hidden bg-zinc-950 flex flex-col">
              {activeItem.pdfUrl ? (
                <PdfNotebookViewer
                  key={activeItem.id || activeItem.pdfUrl}
                  pdfUrl={activeItem.pdfUrl}
                  noteId={activeItem.id}
                  notePath={activeItem.title}
                  initialNotesStr={activeItem.content}
                  isDark={true}
                />
              ) : (
                <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-6 sm:p-8 flex flex-col items-center">
                  <div className="w-full max-w-3xl flex flex-col gap-4">
                    <div className="pb-4 border-b border-zinc-800">
                      <h1 className="text-2xl font-bold tracking-tight text-zinc-100">{activeItem.title}</h1>
                      <div className="flex items-center gap-2 mt-2 text-xs font-mono text-zinc-400">
                        <span>{activeItem.folder || 'Root'}</span>
                        <span>/</span>
                        <span>{activeItem.wordCount || 0} words</span>
                      </div>
                    </div>
                    <div className="prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {activeItem.content || 'This note does not have text content yet.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

        </div>
      )}

      {/* QUIZ TAB */}
      {activeTab === 'quiz' && (
        <div className="flex-1 h-full min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 flex justify-center">
          <div className="w-full max-w-5xl">
            <CozyQuizTab />
          </div>
        </div>
      )}

      {/* STATS & THEMES TAB */}
      {activeTab === 'stats' && (
        <div className="flex-1 h-full min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 flex justify-center">
          <div className="w-full max-w-6xl">
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
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <div 
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-pop-in relative select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-zinc-100">Study Shortcuts</h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs text-zinc-300">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span>Toggle Focus Timer</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 font-mono text-[10px] text-amber-400">Click Timer</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span>Select Document / Book</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 font-mono text-[10px] text-amber-400">Library Click</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span>Annotation Tools</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 font-mono text-[10px] text-amber-400">Top Portal Bar</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span>Page-by-Page Notes</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 font-mono text-[10px] text-amber-400">Sidebar Icon</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}