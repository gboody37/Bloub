'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Upload, 
  Search, 
  Sparkles, 
  Check, 
  ChevronRight, 
  Sliders, 
  Eye, 
  ShieldCheck, 
  Palette,
  Compass,
  Bot
} from 'lucide-react';
import type { StudyItem } from './CozyBooksAndNotes';

interface CozyStatsThemesTabProps {
  onSelectBook?: (bookTitle: string) => void;
  activeTheme?: string;
  onThemeChange?: (themeKey: string) => void;
}

export default function CozyStatsThemesTab({
  onSelectBook,
  activeTheme = 'Dark Loft',
  onThemeChange
}: CozyStatsThemesTabProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(activeTheme);
  
  // Toggles for Display Preferences
  const [paperTexture, setPaperTexture] = useState(true);
  const [highContrast, setHighContrast] = useState(true);
  const [arabicBidi, setArabicBidi] = useState(true);

  const themes = [
    { name: 'Dark Loft', color: '#15161b', accent: '#f59e0b', hex: '#15161b' },
    { name: 'Obsidian Noir', color: '#0c0d10', accent: '#94a3b8', hex: '#0c0d10' },
    { name: 'Matcha Garden', color: '#101f18', accent: '#10b981', hex: '#101f18' },
    { name: 'Midnight Abyss', color: '#0e0f2d', accent: '#3b82f6', hex: '#0e0f2d' },
    { name: 'Warm Sand', color: '#1e1714', accent: '#d97706', hex: '#1e1714' },
  ];

  const books = [
    {
      id: 'book-1',
      title: 'Chapter 4: Optics & Quantum Waves',
      category: 'PHYSICS 12 / 148 PAGES',
      description: 'Photoelectric effect, stopping potential, and Einsteinian wave-particle duality.',
      badge: 'Active Now',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      progress: 68,
      statusText: 'Page 101 of 148',
      actionText: 'Open Book',
      actionColor: 'text-amber-400',
    },
    {
      id: 'book-2',
      title: 'Photoelectric Effect Derivation Notes',
      category: 'PHYSICS / FORMULAS',
      description: 'Step-by-step LaTeX formulas, threshold frequency derivations, and work function...',
      badge: 'Completed',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      progress: 100,
      statusText: '18 / 18 notes synced',
      actionText: 'Review Notes',
      actionColor: 'text-emerald-400',
    },
    {
      id: 'book-3',
      title: 'Modern Physics Complete Textbook',
      category: 'GRADE 12 ADVANCED',
      description: 'Full official ministerial textbook including atomic models and nuclear decay modules.',
      badge: 'PDF Textbook',
      badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      progress: 42,
      statusText: 'Page 142 of 348',
      actionText: 'Continue',
      actionColor: 'text-sky-400',
    },
    {
      id: 'book-4',
      title: 'Tawjihi 2024 Physics Revision Guide',
      category: 'EXAM QUESTION BANK',
      description: 'High-yield question banks, past year ministerial exam papers, and rubric analyses.',
      badge: 'Ministerial Prep',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      progress: 25,
      statusText: '12 of 48 Sets Done',
      actionText: 'Solve Tests',
      actionColor: 'text-purple-400',
    },
  ];

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchFilter.toLowerCase()) || 
    b.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleSelectTheme = (name: string) => {
    setSelectedTheme(name);
    if (onThemeChange) {
      onThemeChange(name);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col gap-6 text-stone-200 select-none pb-12">
      
      {/* 1. Study Library & Textbooks Section */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <BookOpen size={16} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#f5efe6]">
                Study Library & Textbooks
              </h2>
              <p className="text-xs text-stone-400 font-medium">
                Active study books, ministerial syllabus curriculum & interactive notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                placeholder="Filter library..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[#1a1614] border border-[#2e241d] text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60 transition-colors w-48 sm:w-60"
              />
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-transform active:scale-[0.98] shadow-sm"
            >
              <Upload size={13} />
              <span>Upload Book (PDF/MD)</span>
            </button>
          </div>
        </div>

        {/* 4 Book Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => onSelectBook && onSelectBook(book.title)}
              className="p-4 rounded-2xl bg-[#181412] hover:bg-[#1f1915] border border-[#2b221b] hover:border-amber-500/40 transition-all flex flex-col justify-between gap-3 group cursor-pointer"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-500">
                    <BookOpen size={13} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${book.badgeColor}`}>
                    {book.badge}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-semibold tracking-wider text-stone-400 uppercase block">
                    {book.category}
                  </span>
                  <h3 className="text-sm font-bold text-stone-100 group-hover:text-amber-400 transition-colors leading-snug line-clamp-1">
                    {book.title}
                  </h3>
                </div>

                <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                  {book.description}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-stone-800/40">
                <div className="flex items-center justify-between text-[11px] font-medium text-stone-400">
                  <span>Reading Progress</span>
                  <span className="font-mono font-bold text-stone-200">{book.progress}%</span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-stone-900 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${book.progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${book.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-stone-500 font-mono">{book.statusText}</span>
                  <span className={`font-semibold flex items-center gap-1 ${book.actionColor}`}>
                    {book.actionText} <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Themes & Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left 7 Cols: Themes & Preferences */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-[#181412] border border-[#2b221b] flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-[#292019] pb-3">
              <div className="flex items-center gap-2">
                <Palette size={14} className="text-amber-500" />
                <h3 className="text-sm font-bold text-stone-100">
                  Visual Themes & Atmosphere
                </h3>
              </div>
              <span className="text-[10px] font-mono text-stone-500">
                CSS Dark Tokens
              </span>
            </div>

            {/* Theme Swatches */}
            <div>
              <span className="text-xs font-semibold text-stone-400 mb-2.5 block">
                Active Workspace Theme
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {themes.map((t) => {
                  const isSelected = selectedTheme === t.name;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => handleSelectTheme(t.name)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-[#221c17] border-amber-500 ring-1 ring-amber-500/40 text-stone-100'
                          : 'bg-[#14110f] hover:bg-[#1b1613] border-[#292019] text-stone-400'
                      }`}
                    >
                      <div 
                        className="w-5 h-5 rounded-full border border-stone-700 flex items-center justify-center shadow-inner"
                        style={{ backgroundColor: t.accent }}
                      >
                        {isSelected && <Check size={11} className="text-stone-950 font-bold" />}
                      </div>
                      <span className="text-xs font-bold truncate max-w-full">
                        {t.name}
                      </span>
                      <span className="text-[9px] font-mono text-stone-500">
                        {t.hex}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reading Engine Preferences */}
            <div className="pt-2 border-t border-[#292019] flex flex-col gap-3">
              <span className="text-xs font-semibold text-stone-400 block">
                Reading Engine & Display Preferences
              </span>

              {/* Toggle 1 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#14110f] border border-[#292019]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-stone-200">
                    Paper Texture & Grain Overlay
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Soft matte stippling reduces OLED screen glare during nighttime focus
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPaperTexture(!paperTexture)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                    paperTexture ? 'bg-amber-500' : 'bg-stone-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-stone-950 transition-transform ${
                    paperTexture ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle 2 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#14110f] border border-[#292019]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-stone-200">
                    High Contrast Equation Text
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Sharp pure-white rendering for complex LaTeX physics superscripts
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHighContrast(!highContrast)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                    highContrast ? 'bg-amber-500' : 'bg-stone-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-stone-950 transition-transform ${
                    highContrast ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle 3 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#14110f] border border-[#292019]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-stone-200">
                    Arabic BiDi Auto-Alignment (محاذاة نص التدريس)
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Detects mixed Arabic ministerial questions and formats right-to-left automatically
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setArabicBidi(!arabicBidi)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                    arabicBidi ? 'bg-amber-500' : 'bg-stone-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-stone-950 transition-transform ${
                    arabicBidi ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* Right 5 Cols: Bloub Companion Presence & Lo-Fi Player */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-[#181412] border border-[#2b221b] flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-[#292019] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" />
                <h3 className="text-sm font-bold text-stone-100">
                  Bloub Companion Presence
                </h3>
              </div>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>

            {/* Mascot Avatar Card */}
            <div className="p-4 rounded-xl bg-[#14110f] border border-[#292019] flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
                  <Bot size={20} className="text-amber-400" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                  Ready to assist in Study Workspace
                </span>
                <p className="text-xs text-stone-300 leading-relaxed italic">
                  &ldquo;Your study workspace is synced with local notes and cloud storage. Focus on one concept at a time!&rdquo;
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#14110f] border border-[#292019] flex items-center justify-between text-xs text-stone-400">
              <span className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Zero Data Loss Protection</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-400 font-bold">WAL ACTIVE</span>
            </div>

          </div>
        </div>

      </div>

      {/* 4. Footer */}
      <footer className="pt-4 border-t border-stone-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-stone-400">Bloub Studio v2.4</span>
          <span className="text-stone-700">/</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> All Changes Auto-Saved
          </span>
        </div>

        <div className="flex items-center gap-4 text-stone-400">
          <span className="hover:text-stone-200 cursor-pointer">Keyboard Shortcuts</span>
          <span className="text-stone-700">/</span>
          <span className="hover:text-stone-200 cursor-pointer">Ministerial Exam Syllabus 2024</span>
        </div>
      </footer>

    </div>
  );
}
