'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, HelpCircle, Menu, BookOpen, X, Sparkles, Shapes, Smile, PaintBucket, 
  ArrowLeft, Check, Smartphone, Monitor, Play, Pause, RotateCcw, Flame, Plus,
  FileText
} from 'lucide-react';
import MochiHeaderBadge from '@/components/mascot/MochiHeaderBadge';
import CozyDailyQuests from '@/components/todo/CozyDailyQuests';
import CozyParchmentReader from '@/components/study/CozyParchmentReader';
import CozyStudyNotepad from '@/components/study/CozyStudyNotepad';
import NoteExplorer from '@/components/study/NoteExplorer';
import NoteViewer from '@/components/study/NoteViewer';
import BloubMascot from '@/components/BloubMascot';
import type { StudyQuest, StudyNote } from '@/types/study';
import type { ParsedObsidianNote } from '@/types/obsidian';
import { fetchQuests, saveQuestToggle, createQuest, removeQuest } from '@/lib/study/service';

const SHAPE_IDS = ['squircle', 'cercle', 'galet', 'capsule', 'triangle', 'hexagone', 'nuage', 'goutte', 'oeuf', 'soleil', 'fromage', 'livre'];

export default function BloubHome() {
  const [quests, setQuests] = useState<StudyQuest[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(true);
  
  // Pomodoro & Streak State
  const [pomodoroSeconds, setPomodoroSeconds] = useState(24 * 60 + 18);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [streakDays, setStreakDays] = useState(4);
  const [pomodoroSession, setPomodoroSession] = useState(3);
  
  // Active study note / book
  const [selectedNote, setSelectedNote] = useState<ParsedObsidianNote | null>(null);
  const [isFetchingNote, setIsFetchingNote] = useState(false);

  // Modals
  const [showStudyExplorer, setShowStudyExplorer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mobileTab, setMobileTab] = useState<'quests' | 'study' | 'notepad'>('quests');

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

  // Mascot customization
  const [mascotShape, setMascotShape] = useState('squircle');
  const [mascotColor, setMascotColor] = useState('creme');
  const [mascotExpr, setMascotExpr] = useState<'attentif' | 'fier' | 'heureux' | 'curieux'>('attentif');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Initial load
  useEffect(() => {
    fetchQuests().then(items => {
      setQuests(items);
      setLoadingQuests(false);
    });

    if (typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem('bloub_theme');
        if (savedTheme === 'bg-[#101412]' || savedTheme === 'bg-[#141211]') {
          setBgTheme(savedTheme as any);
        }
        const savedShape = localStorage.getItem('bloub_mascot_shape');
        if (savedShape) setMascotShape(savedShape);
        const savedColor = localStorage.getItem('bloub_mascot_color');
        if (savedColor) setMascotColor(savedColor);
        const savedKey = localStorage.getItem('bloub_gemini_key') || localStorage.getItem('vibe_geminiApiKey');
        if (savedKey) setGeminiApiKey(savedKey);
      } catch {}
    }
  }, []);

  // Save quests to storage whenever modified
  const updateQuests = (newQuests: StudyQuest[]) => {
    setQuests(newQuests);
    try {
      localStorage.setItem('bloub_quests', JSON.stringify(newQuests));
    } catch {}
  };

  const handleToggleQuest = async (id: string, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    updateQuests(quests.map(q => q.id === id ? { ...q, completed: nextCompleted } : q));
    await saveQuestToggle(id, nextCompleted);
  };

  const handleAddQuest = async (title: string) => {
    const newQuest = await createQuest(title);
    updateQuests([...quests, newQuest]);
  };

  const handleDeleteQuest = async (id: string) => {
    updateQuests(quests.filter(q => q.id !== id));
    await removeQuest(id);
  };

  const toggleTheme = () => {
    const next = bgTheme === 'bg-[#141211]' ? 'bg-[#101412]' : 'bg-[#141211]';
    setBgTheme(next);
    try {
      localStorage.setItem('bloub_theme', next);
    } catch {}
  };

  const completedCount = quests.filter(q => q.completed).length;
  const isMatcha = bgTheme === 'bg-[#101412]';

  return (
    <div className={`min-h-screen w-full ${bgTheme} transition-colors duration-500 font-sans text-stone-100 flex flex-col`}>
      <main className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 mx-auto flex-1 flex flex-col relative py-4">
        
        {/* Header */}
        {!selectedNote && (
          <header className="pt-2 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none border-b border-stone-800/40 mb-3">
            {/* Left: Brand with breadcrumbs */}
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setSelectedNote(null)}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black text-xl group-hover:scale-105 transition-transform">
                  (
                </div>
                <span className="text-xl font-bold tracking-tight text-[#f5efe6] font-sans">
                  Bloub
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400 font-medium pl-2 border-l border-stone-800">
                <span className="hover:text-stone-300 cursor-pointer">Physics</span>
                <span className="text-stone-600">›</span>
                <span className="text-amber-400/90 truncate max-w-[210px]">Chapter 4: Optics & Quantum Waves</span>
              </div>
            </div>

            {/* Center: Interactive Mascot Status & Pomodoro Island */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1c1714] border border-[#332a22] shadow-lg text-xs">
                <div className="flex items-center gap-1.5 pr-2 border-r border-stone-800">
                  <span className={`w-2 h-2 rounded-full ${quests.length > 0 && completedCount < quests.length ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="font-semibold text-stone-200">
                    {quests.length === 0
                      ? 'Bloub is resting'
                      : completedCount === quests.length
                      ? 'All quests complete!'
                      : 'Bloub is studying'}
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

            {/* Right: Streak & Actions */}
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

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-300 hover:text-white bg-[#221c18] border border-[#382f27] shadow-sm transition-colors"
                title="Settings & Mascot"
              >
                <Menu size={14} />
              </button>
            </div>
          </header>
        )}

        {/* Full Note / Book Reader Mode */}
        {selectedNote ? (
          <div className="flex-1 flex flex-col h-full min-h-0 py-2">
            <div className="flex items-center justify-between pb-3 mb-2 px-1">
              <button
                type="button"
                onClick={() => setSelectedNote(null)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#241e1a] border border-[#382f28] text-xs font-semibold text-stone-300 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Loft</span>
              </button>
              <span className="text-xs text-stone-400 font-mono truncate max-w-sm">
                {selectedNote.title}
              </span>
            </div>
            <div className="flex-1 rounded-[28px] overflow-hidden border border-[#2e2620] bg-[#181412] shadow-2xl min-h-[620px] flex flex-col">
              <NoteViewer
                note={selectedNote}
                isLoading={isFetchingNote}
                onClose={() => setSelectedNote(null)}
                isDark={true}
              />
            </div>
          </div>
        ) : (
          /* Main 3-Column Bento Study Grid */
          <div className="flex-1 flex flex-col mb-4 mt-2">
            {/* Desktop (1024px+): 3-Column Equal Grid */}
            <div className="hidden lg:grid grid-cols-3 gap-6 items-stretch min-h-[620px]">
              {/* Column 1: Daily Quests */}
              <div className="col-span-1 h-full">
                <CozyDailyQuests
                  todos={quests.map(q => ({ id: q.id, text: q.title, completed: q.completed } as any))}
                  categories={[]}
                  activeCategory="default"
                  onToggleTodo={(id, completed) => handleToggleQuest(id, !completed)}
                  onAddTodo={(txt) => handleAddQuest(txt)}
                  onDeleteTodo={(id) => handleDeleteQuest(id)}
                  isMatcha={isMatcha}
                />
              </div>

              {/* Column 2: Cozy Study Session & Parchment Reader */}
              <div className="col-span-1 h-full">
                <CozyParchmentReader
                  note={selectedNote}
                  onOpenVault={() => setShowStudyExplorer(true)}
                  isMatcha={isMatcha}
                />
              </div>

              {/* Column 3: Live Study Notepad */}
              <div className="col-span-1 h-full">
                <CozyStudyNotepad
                  isMatcha={isMatcha}
                  activeNoteTitle="Physics Module 4"
                  onSendToQuests={(text) => handleAddQuest(text)}
                />
              </div>
            </div>

            {/* Mobile / Tablet View (< 1024px) */}
            <div className="flex lg:hidden flex-col gap-4">
              <div className="flex items-center justify-center p-1 rounded-2xl bg-[#1c1917] border border-stone-800">
                <button
                  type="button"
                  onClick={() => setMobileTab('quests')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    mobileTab === 'quests' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400'
                  }`}
                >
                  Daily Quests
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('study')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    mobileTab === 'study' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400'
                  }`}
                >
                  Study Session
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
                {mobileTab === 'quests' && (
                  <CozyDailyQuests
                    todos={quests.map(q => ({ id: q.id, text: q.title, completed: q.completed } as any))}
                    categories={[]}
                    activeCategory="default"
                    onToggleTodo={(id, completed) => handleToggleQuest(id, !completed)}
                    onAddTodo={(txt) => handleAddQuest(txt)}
                    onDeleteTodo={(id) => handleDeleteQuest(id)}
                    isMatcha={isMatcha}
                  />
                )}
                {mobileTab === 'study' && (
                  <div className="h-[560px]">
                    <CozyParchmentReader
                      note={selectedNote}
                      onOpenVault={() => setShowStudyExplorer(true)}
                      isMatcha={isMatcha}
                    />
                  </div>
                )}
                {mobileTab === 'notepad' && (
                  <div className="h-[560px]">
                    <CozyStudyNotepad
                      isMatcha={isMatcha}
                      activeNoteTitle="Physics Module 4"
                      onSendToQuests={(text) => handleAddQuest(text)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Study Vault Explorer Modal */}
      {showStudyExplorer && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setShowStudyExplorer(false)}
        >
          <div 
            className="bg-[#181412] border border-[#2e2620] rounded-[28px] p-6 max-w-2xl w-full max-h-[85vh] h-[640px] flex flex-col shadow-2xl animate-pop-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-2 border-b border-[#2e2620]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f5efe6] tracking-tight">Study Vault & Books</h3>
                  <p className="text-xs text-stone-400">Search or upload books, notes, and PDFs to study with Bloub</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStudyExplorer(false)}
                className="w-8 h-8 rounded-full bg-[#241e1a] border border-[#382f28] flex items-center justify-center text-stone-400 hover:text-stone-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden min-h-0">
              <NoteExplorer
                selectedNoteId={selectedNote?.id}
                onSelectNote={(n) => {
                  setSelectedNote(n as any);
                  setShowStudyExplorer(false);
                }}
                isDark={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Settings & Mascot Customizer Modal */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="bg-[#181412] border border-[#2e2620] rounded-[28px] p-6 max-w-md w-full shadow-2xl animate-pop-in relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2e2620]">
              <h3 className="text-base font-bold text-[#f5efe6]">Bloub Settings</h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-full bg-[#241e1a] border border-[#382f28] flex items-center justify-center text-stone-400 hover:text-stone-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mascot Live Preview */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#241e1a] border border-[#382f28] mb-6">
              <BloubMascot size={80} shape={mascotShape} color={mascotColor} expression={mascotExpr} isStatic={true} />
              <span className="text-xs font-bold text-amber-500 mt-2 uppercase tracking-wider">Bloub Companion</span>
            </div>

            {/* Shape Selector */}
            <div className="mb-5">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">Mascot Shape</span>
              <div className="grid grid-cols-4 gap-2">
                {SHAPE_IDS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setMascotShape(s);
                      try { localStorage.setItem('bloub_mascot_shape', s); } catch {}
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl border capitalize transition-all ${
                      mascotShape === s 
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm' 
                        : 'bg-[#241e1a] border-[#382f28] text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Gemini API Key */}
            <div className="mb-5">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">Gemini AI Key (Optional)</span>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => {
                  setGeminiApiKey(e.target.value);
                  try {
                    localStorage.setItem('bloub_gemini_key', e.target.value);
                    localStorage.setItem('vibe_geminiApiKey', e.target.value);
                  } catch {}
                }}
                placeholder="Paste Gemini API key for AI quiz..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#241e1a] border border-[#382f28] text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-stone-500 mt-1.5">Free key at aistudio.google.com for AI question generator.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition-colors mt-2"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setShowHelp(false)}
        >
          <div 
            className="bg-[#181412] border border-[#2e2620] rounded-[28px] p-6 max-w-sm w-full shadow-2xl animate-pop-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2e2620]">
              <h3 className="text-base font-bold text-[#f5efe6]">Welcome to Bloub</h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 rounded-full bg-[#241e1a] border border-[#382f28] flex items-center justify-center text-stone-400 hover:text-stone-200"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs text-stone-300 leading-relaxed">
              <p>• <strong>Daily Quests</strong>: Click checkmarks to complete your daily study tasks.</p>
              <p>• <strong>Study Session</strong>: Read highlighted physics chapters or open your own PDF books using the Study Vault.</p>
              <p>• <strong>Flashcard Quiz</strong>: Test your knowledge with interactive questions and AI generated tests.</p>
              <p>• <strong>Theme Toggle</strong>: Click the group icon or mascot pill to switch between Amber Loft and Matcha Sage.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition-colors mt-5"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
