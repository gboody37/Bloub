'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, FileText, Search, UploadCloud, Plus, 
  ExternalLink, Clock, Tag, ChevronRight, CheckCircle2,
  FileCode, Layers, Trash2
} from 'lucide-react';
import type { ParsedObsidianNote } from '@/types/obsidian';
import { createClient } from '@/lib/supabase/client';

export interface StudyItem {
  id: string;
  title: string;
  type: 'book' | 'note' | 'pdf';
  folder?: string;
  tags?: string[];
  readProgress?: number; // e.g. 68%
  pageCount?: number;
  wordCount?: number;
  updatedAt?: string;
  content?: string;
  pdfUrl?: string;
}

export const INITIAL_STUDY_ITEMS: StudyItem[] = [
  {
    id: 'note-1',
    title: 'Chapter 4: Optics & Quantum Waves',
    type: 'book',
    folder: 'Physics 12',
    tags: ['Physics', 'Tawjihi 2024', 'Quantum'],
    readProgress: 68,
    wordCount: 1420,
    updatedAt: 'Today',
    content: `# Chapter 4: Optics & Quantum Waves\n\n## Wave-Particle Duality\nLight exhibits both wave and particulate aspects. When radiation interacts with matter on microscopic atomic scales, it behaves as discrete localized packets of energy termed photons, each possessing an energy proportional to its oscillatory frequency.\n\n## Photoelectric Quantization\nIn classical electromagnetism, James Clerk Maxwell's electrodynamics posited continuous spherical wave propagation. However, Heinrich Hertz's experimental observation of the photoelectric effect (1887) contradicted classical wave theory.\n\n## Einstein Photoelectric Law (1905)\nE_k(max) = h*v - Phi\n\n- Threshold cutoff frequency v_0 determines immediate photoelectron emission.\n- Material work function Phi represents minimum required binding energy.\n- Kinetic energy varies linearly with incident radiation frequency.`,
  },
  {
    id: 'note-2',
    title: 'Photoelectric Effect Derivation & Notes',
    type: 'note',
    folder: 'Physics 12',
    tags: ['Derivations', 'Important'],
    readProgress: 100,
    wordCount: 840,
    updatedAt: 'Yesterday',
    content: `# Photoelectric Effect Derivation\n\nEinstein proposed that incoming photons transfer their entire energy h*v to a single electron in a 1-to-1 collision.\n\nConservation of energy yields:\nh*v = Phi + E_k(max)\nWhere Phi = h*v_0 is the work function.\n\nIf v < v_0, no electrons are ejected regardless of the beam intensity!`,
  },
  {
    id: 'note-3',
    title: 'Modern Physics Complete Textbook',
    type: 'pdf',
    folder: 'Textbooks',
    tags: ['PDF', 'Curriculum'],
    pageCount: 148,
    readProgress: 42,
    updatedAt: '3 days ago',
    content: `# Modern Physics Complete Textbook\n\nIncludes chapters on:\n1. Special Relativity\n2. Photons & Light Waves\n3. The Bohr Model\n4. Quantum Mechanics\n5. Nuclear Structure`,
  },
  {
    id: 'note-4',
    title: 'Wave Mechanics & de Broglie Wavelength',
    type: 'note',
    folder: 'Quantum Physics',
    tags: ['Formulas', 'Matter Waves'],
    readProgress: 85,
    wordCount: 650,
    updatedAt: 'Sep 7',
    content: `# de Broglie Hypothesis (1924)\n\nIf light waves can exhibit particle behavior (photons with momentum p = h / lambda), then particles of matter (electrons, protons) should also exhibit wave properties!\n\nlambda = h / p = h / (m * v)\n\nConfirmed experimentally by Davisson & Germer in 1927.`,
  },
  {
    id: 'note-5',
    title: 'Tawjihi 2024 Physics Revision Guide',
    type: 'book',
    folder: 'Exams',
    tags: ['Exam Prep', 'Summary'],
    readProgress: 25,
    wordCount: 3200,
    updatedAt: 'Sep 5',
    content: `# Tawjihi 2024 Physics Revision Guide\n\nKey Focus Areas for Ministerial Exams:\n- Electromagnetism & Induction\n- Quantum Physics & Photoelectric Calculations\n- Atomic Spectra & Energy Level Transitions\n- Nuclear Physics & Radioactive Decay Rates`,
  },
];

interface CozyBooksAndNotesProps {
  activeItemId: string | null;
  onSelectItem: (item: StudyItem) => void;
  isMatcha?: boolean;
}

export default function CozyBooksAndNotes({
  activeItemId,
  onSelectItem,
  isMatcha = false,
}: CozyBooksAndNotesProps) {
  const [items, setItems] = useState<StudyItem[]>(INITIAL_STUDY_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'books' | 'notes' | 'pdfs'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Load study items from localStorage or Supabase
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bloub_study_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      }
    } catch {}

    // Also attempt fetching from Supabase study_notes
    supabase.from('study_notes').select('*').then(res => {
      if (res.data && res.data.length > 0) {
        const dbItems: StudyItem[] = res.data.map(n => ({
          id: n.id,
          title: n.title,
          type: n.pdf_url ? 'pdf' : 'note',
          tags: n.tags || [],
          content: n.content || '',
          pdfUrl: n.pdf_url,
          updatedAt: 'Synced',
        }));
        setItems(prev => {
          const ids = new Set(prev.map(p => p.id));
          const newItems = dbItems.filter(d => !ids.has(d.id));
          return [...prev, ...newItems];
        });
      }
    });
  }, []);

  const saveItems = (newItems: StudyItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem('bloub_study_items', JSON.stringify(newItems));
    } catch {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const title = file.name.replace(/\.[^/.]+$/, '');

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const newItem: StudyItem = {
        id: 'user-' + Date.now(),
        title,
        type: isPdf ? 'pdf' : 'note',
        tags: [isPdf ? 'PDF' : 'Note', 'Uploaded'],
        readProgress: 0,
        wordCount: content.split(/\s+/).filter(Boolean).length,
        updatedAt: 'Just now',
        content: content || `# ${title}\n\nUploaded file content.`,
      };

      const updated = [newItem, ...items];
      saveItems(updated);
      onSelectItem(newItem);

      // Sync to Supabase study_notes
      supabase.from('study_notes').insert([{
        title: newItem.title,
        content: newItem.content,
        tags: newItem.tags,
      }]).then(() => {});
    };

    if (isPdf) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleAddNewNote = () => {
    const title = prompt('Enter note or chapter title:');
    if (!title || !title.trim()) return;

    const newItem: StudyItem = {
      id: 'note-' + Date.now(),
      title: title.trim(),
      type: 'note',
      tags: ['Study Note'],
      readProgress: 0,
      wordCount: 0,
      updatedAt: 'Just now',
      content: `# ${title.trim()}\n\nStart typing your study notes here...`,
    };

    const updated = [newItem, ...items];
    saveItems(updated);
    onSelectItem(newItem);

    // Sync to Supabase
    supabase.from('study_notes').insert([{
      title: newItem.title,
      content: newItem.content,
      tags: newItem.tags,
    }]).then(() => {});
  };

  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Remove this document from your study list?')) return;
    const updated = items.filter(i => i.id !== id);
    saveItems(updated);
  };

  // Filter items
  const filtered = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    if (!matchesSearch) return false;
    if (activeFilter === 'books') return item.type === 'book';
    if (activeFilter === 'notes') return item.type === 'note';
    if (activeFilter === 'pdfs') return item.type === 'pdf';
    return true;
  });

  return (
    <div className={`rounded-[28px] border transition-all duration-200 shadow-2xl flex flex-col h-full w-full overflow-hidden ${
      isMatcha
        ? 'bg-[#18211c] border-[#84a98c]/20'
        : 'bg-[#181412] border-[#29221d]'
    }`}>
      {/* Header */}
      <div className="p-5 pb-3 border-b border-stone-800/60 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#f5efe6] tracking-tight">
                Books & Notes
              </h3>
              <p className="text-[11px] text-stone-400">
                {items.length} study documents in library
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".pdf,.md,.txt" 
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg bg-stone-900/80 border border-stone-800 text-stone-400 hover:text-amber-400 transition-colors"
              title="Upload PDF or Markdown Note"
            >
              <UploadCloud className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleAddNewNote}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Create New Study Note"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search books, chapters, tags..."
            className="w-full bg-stone-900/60 border border-stone-800/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-600 outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-[11px] select-none">
          {(['all', 'books', 'notes', 'pdfs'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`px-2.5 py-0.5 rounded-full capitalize font-medium transition-all ${
                activeFilter === f
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List of Books & Notes */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-stone-500 text-xs">
            <BookOpen className="w-8 h-8 mb-2 opacity-30 text-amber-500" />
            <p>No documents found matching "{searchQuery}"</p>
          </div>
        ) : (
          filtered.map(item => {
            const isSelected = activeItemId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer group flex flex-col gap-2 relative ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                    : 'bg-[#120f0d] border-stone-800/80 hover:border-amber-500/20 hover:bg-[#161210]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 shrink-0 ${
                      item.type === 'book'
                        ? 'bg-amber-500/15 text-amber-400'
                        : item.type === 'pdf'
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-blue-500/15 text-blue-400'
                    }`}>
                      {item.type === 'book' && <BookOpen className="w-3.5 h-3.5" />}
                      {item.type === 'pdf' && <FileText className="w-3.5 h-3.5" />}
                      {item.type === 'note' && <FileCode className="w-3.5 h-3.5" />}
                    </div>

                    <div>
                      <h4 className={`text-xs font-semibold leading-snug ${
                        isSelected ? 'text-amber-300 font-bold' : 'text-[#f5efe6] group-hover:text-amber-400'
                      }`}>
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-500">
                        {item.folder && <span>{item.folder}</span>}
                        {item.wordCount ? <span>• {item.wordCount} words</span> : null}
                        {item.pageCount ? <span>• {item.pageCount} pages</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-800 text-stone-500 hover:text-rose-400 transition-opacity"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${
                      isSelected ? 'text-amber-400 translate-x-0.5' : 'text-stone-600'
                    }`} />
                  </div>
                </div>

                {/* Progress bar or tags */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-800/40 text-[10px]">
                  <div className="flex items-center gap-1 flex-wrap">
                    {item.tags?.slice(0, 2).map((t, idx) => (
                      <span 
                        key={idx}
                        className="px-1.5 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-stone-400 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {item.readProgress !== undefined && (
                    <div className="flex items-center gap-1.5 text-stone-400 font-mono">
                      <div className="w-12 h-1 bg-stone-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full" 
                          style={{ width: `${item.readProgress}%` }}
                        />
                      </div>
                      <span>{item.readProgress}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info */}
      <div className="px-5 py-2.5 bg-[#100d0b] border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-500 font-mono select-none">
        <span>{filtered.length} visible</span>
        <button
          type="button"
          onClick={handleAddNewNote}
          className="hover:text-amber-400 transition-colors flex items-center gap-1 text-amber-500 font-semibold"
        >
          <span>+ Quick Note</span>
        </button>
      </div>
    </div>
  );
}