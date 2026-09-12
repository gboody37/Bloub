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
      title: 'Islamic Studies (Deen) - Grade 11',
      category: 'TAWJIHI 2025 / 189 PAGES',
      description: 'Surah An-Nur verses, legal penalties, Asbab An-Nuzul, and authentic ministerial curriculum.',
      badge: 'Active Now',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      progress: 68,
      statusText: 'Page 6 of 189',
      actionText: 'Open Book',
      actionColor: 'text-amber-400',
    },
    {
      id: 'book-2',
      title: 'Advanced English Language',
      category: 'GRADE 11 ADVANCED',
      description: 'Conditionals, reported speech, literature comprehension essays, and grammar exercises.',
      badge: 'Curriculum',
      badgeColor: 'text-zinc-300 bg-white/[0.04] border-white/[0.08]',
      progress: 42,
      statusText: 'Unit 4 In Progress',
      actionText: 'Continue',
      actionColor: 'text-zinc-300',
    },
    {
      id: 'book-3',
      title: 'Contemporary History of Jordan',
      category: 'MINISTERIAL STANDARD',
      description: 'The Great Arab Revolt, modern state institutions, and constitutional milestones.',
      badge: 'Completed',
      badgeColor: 'text-zinc-300 bg-white/[0.04] border-white/[0.08]',
      progress: 90,
      statusText: '96 / 96 pages reviewed',
      actionText: 'Review',
      actionColor: 'text-zinc-300',
    },
    {
      id: 'book-4',
      title: 'Arabic Grammar & Rhetoric (Balagha)',
      category: 'TAWJIHI CORE',
      description: 'Morphology, syntax rules, classical Arabic poetry analysis, and exam drills.',
      badge: 'Study Bank',
      badgeColor: 'text-zinc-300 bg-white/[0.04] border-white/[0.08]',
      progress: 35,
      statusText: 'Chapter 2 Active',
      actionText: 'Study Notes',
      actionColor: 'text-zinc-300',
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
    <div className="w-full flex-1 flex flex-col gap-6 text-zinc-200 select-none pb-12">
      
      {/* 1. Study Library & Textbooks Section */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300">
              <BookOpen size={15} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white">
                Study Library &amp; Curriculum
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Active study books, ministerial syllabus curriculum &amp; interactive notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter library..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[#141417] border border-white/[0.08] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 transition-colors w-48 sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* 4 Book Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => onSelectBook && onSelectBook(book.title)}
              className="p-4 rounded-xl bg-[#121215] hover:bg-[#18181d] border border-white/[0.06] hover:border-amber-500/40 transition-all flex flex-col justify-between gap-3 group cursor-pointer shadow-sm"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400">
                    <BookOpen size={13} />
                  </div>
                  <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${book.badgeColor}`}>
                    {book.badge}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-medium tracking-wider text-zinc-500 uppercase block">
                    {book.category}
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors leading-snug line-clamp-1">
                    {book.title}
                  </h3>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {book.description}
                </p>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>Progress</span>
                  <span className="text-zinc-300 font-medium">{book.progress}%</span>
                </div>
                <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div 
                    className="h-full bg-zinc-300 transition-all duration-300"
                    style={{ width: `${book.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-zinc-500">{book.statusText}</span>
                  <span className="font-semibold text-zinc-300 group-hover:text-amber-400 flex items-center gap-0.5 transition-colors">
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
          <div className="p-5 rounded-2xl bg-[#121215] border border-white/[0.07] flex flex-col gap-4 shadow-sm">
            
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Palette size={14} className="text-zinc-400" />
                <h3 className="text-sm font-semibold text-white">
                  Visual Themes &amp; Atmosphere
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                CSS Dark Tokens
              </span>
            </div>

            {/* Theme Swatches */}
            <div>
              <span className="text-xs font-medium text-zinc-400 mb-2.5 block">
                Active Workspace Theme
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {themes.map((t) => {
                  const isSelected = selectedTheme === t.name;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => handleSelectTheme(t.name)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-white/[0.08] border-amber-500 ring-1 ring-amber-500/40 text-white shadow-sm'
                          : 'bg-[#0c0c0e] hover:bg-[#16161a] border-white/[0.06] text-zinc-400'
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center shadow-inner"
                        style={{ backgroundColor: t.accent }}
                      >
                        {isSelected && <Check size={10} className="text-zinc-950 font-bold" />}
                      </div>
                      <span className="text-xs font-medium truncate max-w-full">
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reading Engine Preferences */}
            <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-3">
              <span className="text-xs font-medium text-zinc-400 block">
                Reading Engine &amp; Display Preferences
              </span>

              {/* Toggle 1 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c0c0e] border border-white/[0.06]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-zinc-200">
                    Paper Texture &amp; Grain Overlay
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Soft matte stippling reduces screen glare during focus sessions
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPaperTexture(!paperTexture)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                    paperTexture ? 'bg-amber-500' : 'bg-zinc-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                    paperTexture ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle 2 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c0c0e] border border-white/[0.06]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-zinc-200">
                    High Contrast Text
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Sharp pure-white rendering for equations and annotations
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHighContrast(!highContrast)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                    highContrast ? 'bg-amber-500' : 'bg-zinc-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                    highContrast ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle 3 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c0c0e] border border-white/[0.06]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-zinc-200">
                    Arabic BiDi Auto-Alignment (محاذاة نص التدريس)
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Detects Arabic textbook text and formats right-to-left automatically
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setArabicBidi(!arabicBidi)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                    arabicBidi ? 'bg-amber-500' : 'bg-zinc-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                    arabicBidi ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* Right 5 Cols: Bloub Companion Presence & Lo-Fi Player */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-[#121215] border border-white/[0.07] flex flex-col gap-4 shadow-sm">
            
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  Bloub Companion Presence
                </h3>
              </div>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-medium text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Active
              </span>
            </div>

            {/* Mascot Avatar Card with Authentic Mochi SVG */}
            <div className="p-4 rounded-xl bg-[#0c0c0e] border border-white/[0.06] flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                <svg viewBox="0 0 32 32" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="16" cy="17" rx="12" ry="10.5" fill="#fef3c7" />
                  <ellipse cx="16" cy="21.5" rx="9" ry="4.5" fill="#fde68a" opacity="0.4" />
                  <circle cx="9" cy="18.5" r="2.5" fill="#fca5a5" opacity="0.6" />
                  <circle cx="23" cy="18.5" r="2.5" fill="#fca5a5" opacity="0.6" />
                  <ellipse cx="12" cy="15" rx="1.6" ry="2" fill="#291e14" />
                  <ellipse cx="20" cy="15" rx="1.6" ry="2" fill="#291e14" />
                  <circle cx="12.5" cy="14.3" r="0.6" fill="#ffffff" />
                  <circle cx="20.5" cy="14.3" r="0.6" fill="#ffffff" />
                  <path d="M 14.5 19 Q 16 21 17.5 19" stroke="#291e14" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                </svg>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  Ready to assist in Study Workspace
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed italic">
                  &ldquo;Your study workspace is synced with local notes and cloud storage. Focus on one concept at a time!&rdquo;
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0c0c0e] border border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-zinc-400" />
                <span>Zero Data Loss Protection</span>
              </span>
              <span className="font-mono text-[10px] text-zinc-400 font-medium">SYNC READY</span>
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
