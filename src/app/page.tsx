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
  const [themeName, setThemeName] = useState('Obsidian Dark');
  const [bgClass, setBgClass] = useState('bg-[#09090b]');

  const handleThemeChange = (name: string) => {
    setThemeName(name);
    if (name === 'Obsidian Dark' || name === 'Obsidian Noir') setBgClass('bg-[#09090b]');
    else if (name === 'Matcha Garden') setBgClass('bg-[#101f18]');
    else if (name === 'Midnight Abyss') setBgClass('bg-[#0e0f2d]');
    else if (name === 'Warm Sand') setBgClass('bg-[#1e1714]');
    else setBgClass('bg-[#09090b]');
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
    // Quick preview from static list if available
    const existing = INITIAL_STUDY_ITEMS.find(i => i.id === noteSummary.id || i.title === noteSummary.title);
    if (existing) {
      setActiveItem(existing);
    }

    // Query full note details from API route to get real frontmatter with pdf_notes
    try {
      const lookupParam = noteSummary.relativePath || noteSummary.title || noteSummary.id;
      const res = await fetch(`/api/obsidian/note?path=${encodeURIComponent(lookupParam)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.note) {
          const n = data.note;
          const pdfUrl = n.frontmatter?.pdf_url || existing?.pdfUrl || (n.title.toLowerCase().endsWith('.pdf') ? `/api/obsidian/read?file=${encodeURIComponent(n.relativePath)}` : undefined);
          setActiveItem({
            id: n.id || existing?.id || noteSummary.id,
            title: n.title || existing?.title || noteSummary.title,
            type: pdfUrl ? 'pdf' : 'note',
            folder: n.folder || noteSummary.folder,
            relativePath: n.relativePath || existing?.relativePath || noteSummary.relativePath,
            tags: n.tags || [],
            wordCount: n.wordCount,
            content: n.rawContent || n.content || existing?.content || '',
            pdfUrl: pdfUrl
          });
          return;
        }
      }
    } catch (err) {
      console.warn('Could not fetch note details:', err);
    }

    if (!existing) {
      // Fallback item from summary
      setActiveItem({
        id: noteSummary.id,
        title: noteSummary.title,
        type: noteSummary.title.toLowerCase().endsWith('.pdf') ? 'pdf' : 'note',
        folder: noteSummary.folder,
        relativePath: noteSummary.relativePath,
        tags: noteSummary.tags || [],
        wordCount: noteSummary.wordCount,
        content: ''
      });
    }
  }, []);

  // On initial mount, fetch the active note's full content (including pdf_notes) from Supabase
  useEffect(() => {
    let isCancelled = false;
    async function loadActiveNote() {
      try {
        const lookup = activeItem.relativePath || activeItem.title || activeItem.id;
        const res = await fetch(`/api/obsidian/note?path=${encodeURIComponent(lookup)}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.success && data.note) {
            const n = data.note;
            const pdfUrl = n.frontmatter?.pdf_url || activeItem.pdfUrl;
            setActiveItem(prev => ({
              ...prev,
              id: n.id || prev.id,
              title: n.title || prev.title,
              relativePath: n.relativePath || prev.relativePath,
              content: n.rawContent || n.content || prev.content,
              pdfUrl: pdfUrl || prev.pdfUrl
            }));
          }
        }
      } catch (err) {
        console.warn('Initial note fetch failed:', err);
      }
    }
    loadActiveNote();
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className={`h-screen h-[100dvh] w-full ${bgClass} transition-colors duration-500 font-sans text-stone-100 flex flex-col overflow-hidden`}>
      {/* Top Navigation Bar — Slim 50px Refined Monochrome Header */}
      <header className="h-[50px] px-4 sm:px-6 flex items-center justify-between gap-3 select-none border-b border-white/[0.06] bg-[#09090b]/95 backdrop-blur-md shrink-0 z-30">
        {/* Left: Authentic Bloub Mochi Mascot Logo & Breadcrumb */}
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-2 cursor-pointer group select-none"
            onClick={() => setActiveTab('library')}
          >
            {/* Authentic Plump Mochi Bloub Mascot Avatar */}
            <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-sm border border-amber-500/20 bg-[#24201c]">
              <svg viewBox="0 0 32 32" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Mochi Body Base */}
                <ellipse cx="16" cy="17" rx="12" ry="10.5" fill="#fef3c7" />
                {/* 3D bottom shading */}
                <ellipse cx="16" cy="21.5" rx="9" ry="4.5" fill="#fde68a" opacity="0.4" />
                {/* Rosy Cheeks */}
                <circle cx="9" cy="18.5" r="2.5" fill="#fca5a5" opacity="0.6" />
                <circle cx="23" cy="18.5" r="2.5" fill="#fca5a5" opacity="0.6" />
                {/* Cute wide curious eyes */}
                <ellipse cx="12" cy="15" rx="1.6" ry="2" fill="#291e14" />
                <ellipse cx="20" cy="15" rx="1.6" ry="2" fill="#291e14" />
                {/* Eye sparkle reflection */}
                <circle cx="12.5" cy="14.3" r="0.6" fill="#ffffff" />
                <circle cx="20.5" cy="14.3" r="0.6" fill="#ffffff" />
                {/* Happy Little Smile */}
                <path d="M 14.5 19 Q 16 21 17.5 19" stroke="#291e14" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              Bloub
            </span>
          </div>

          {/* Breadcrumb with clean ChevronRight */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 font-medium pl-2.5 border-l border-white/[0.08]">
            <span 
              onClick={() => setActiveTab('library')}
              className="hover:text-zinc-200 cursor-pointer"
            >
              Workspace
            </span>
            <ChevronRight size={11} className="text-zinc-600 shrink-0" />
            <span className="text-zinc-300 truncate max-w-[200px] sm:max-w-[280px]">
              {activeTab === 'library' || activeTab === 'pdf' ? activeItem.title : activeTab === 'quiz' ? 'Quiz Arena' : 'Scholar Settings'}
            </span>
          </div>
        </div>

        {/* Center: Monochrome Segmented Tabs */}
        <div className="flex items-center gap-3 justify-center">
          <nav className="flex items-center p-0.5 rounded-full bg-zinc-900/90 border border-white/[0.08] shadow-inner text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'library' || activeTab === 'pdf'
                  ? 'bg-white/[0.1] text-white shadow-sm border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {(activeTab === 'library' || activeTab === 'pdf') && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              )}
              Reader
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('quiz')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'quiz'
                  ? 'bg-white/[0.1] text-white shadow-sm border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeTab === 'quiz' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              )}
              Quiz
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stats')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'stats'
                  ? 'bg-white/[0.1] text-white shadow-sm border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeTab === 'stats' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              )}
              Stats
            </button>
          </nav>
        </div>

        {/* Right: Clean Focus Timer, Streak & Settings */}
        <div className="flex items-center gap-2.5 justify-end">
          {/* Minimal Focus Timer with Single Amber Dot */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-white/[0.08] text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-zinc-300 text-[11px] font-medium">
              {formatTimer(pomodoroSeconds)}
            </span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="p-0.5 rounded text-zinc-400 hover:text-white transition-colors"
              title={isTimerRunning ? 'Pause timer' : 'Start timer'}
              aria-label={isTimerRunning ? 'Pause timer' : 'Start timer'}
            >
              {isTimerRunning ? <Pause size={10} /> : <Play size={10} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsTimerRunning(false);
                setPomodoroSeconds(25 * 60);
              }}
              className="p-0.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Reset timer"
              aria-label="Reset timer"
            >
              <RotateCcw size={9} />
            </button>
          </div>

          {/* Neutral Streak Badge */}
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-zinc-300 select-none">
            <Flame size={12} className="text-zinc-400" />
            <span className="text-[11px]">{streakDays} Days</span>
          </div>

          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] transition-colors"
            title="Shortcuts & Info"
            aria-label="Shortcuts & Info"
          >
            <HelpCircle size={14} />
          </button>

          <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-xs font-semibold text-zinc-200">
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
            } h-full border-r border-white/[0.06] bg-[#0c0c0e] flex flex-col flex-shrink-0 transition-all duration-200 z-10 select-none`}
          >
            {!isLibraryCollapsed ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="h-11 border-b border-white/[0.06] px-3.5 flex items-center justify-between gap-2 shrink-0 bg-[#09090b]">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-zinc-400 shrink-0" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 font-sans">
                      Study Library
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLibraryCollapsed(true)}
                    className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
                    title="Collapse Library"
                    aria-label="Collapse Library"
                  >
                    <PanelLeftClose size={15} />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden p-2.5">
                  <NoteExplorer
                    selectedNoteId={activeItem.id}
                    onSelectNote={handleSelectNote}
                    isDark={true}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-3 gap-3 h-full bg-[#0c0c0e]">
                <button
                  type="button"
                  onClick={() => setIsLibraryCollapsed(false)}
                  className="w-8 h-8 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-all active:scale-95 border border-white/[0.06]"
                  title="Expand Library"
                  aria-label="Expand Library"
                >
                  <PanelLeftOpen size={15} />
                </button>

                <div className="w-6 h-px bg-white/[0.06] my-1" />

                <button
                  type="button"
                  onClick={() => setIsLibraryCollapsed(false)}
                  className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] flex items-center justify-center transition-all active:scale-95"
                  title="Upload PDF to Library"
                  aria-label="Upload PDF"
                >
                  <UploadCloud size={15} />
                </button>

                <div className="flex-1" />

                <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 select-none pb-2">
                  LIBRARY
                </div>
              </div>
            )}
          </aside>

          {/* PANE 2 (CENTER) & PANE 3 (RIGHT): Full-Height Reading Canvas + Integrated Portal Header + Page-Synchronized Notes */}
          <section className="flex-1 h-full min-w-0 flex flex-col relative bg-[#09090b] overflow-hidden">
            {/* Integrated Header hosting Document Title & #pdf-tools-portal */}
            <header className="h-11 border-b border-white/[0.06] bg-[#0c0c0e]/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 shrink-0 z-20 select-none">
              {/* Left: Active Document Title & Badges */}
              <div className="flex items-center gap-2 min-w-0">
                {isLibraryCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsLibraryCollapsed(false)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors shrink-0"
                    title="Open Library"
                    aria-label="Open Library"
                  >
                    <PanelLeftOpen size={15} />
                  </button>
                )}
                <FileText size={14} className="text-zinc-400 shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-zinc-100 truncate max-w-[140px] sm:max-w-xs md:max-w-sm tracking-tight" title={activeItem.title}>
                  {activeItem.title}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 font-medium uppercase shrink-0">
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
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-medium transition-all active:scale-95"
                  title="Start AI Quiz on this Document"
                >
                  <Sparkles size={12} className="text-amber-400" />
                  <span className="hidden md:inline">Quiz</span>
                </button>
              </div>
            </header>

            {/* Viewport: Continuous Multi-Page Scrolling PDF Reader with Right-Hand NotesPanel */}
            <div className="flex-1 h-full min-h-0 relative overflow-hidden bg-[#09090b] flex flex-col">
              {activeItem.pdfUrl ? (
                <PdfNotebookViewer
                  key={activeItem.id || activeItem.pdfUrl}
                  pdfUrl={activeItem.pdfUrl}
                  noteId={activeItem.id}
                  notePath={activeItem.relativePath || activeItem.title}
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