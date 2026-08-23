'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Search, 
  Tag, 
  Hash, 
  RotateCw, 
  Clock, 
  BookOpen, 
  ChevronRight, 
  Layers, 
  X, 
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { ObsidianNoteSummary, VaultScanSummary } from '@/types/obsidian';

interface NoteExplorerProps {
  vaultPath?: string;
  scopedFolder?: string;
  scopedTags?: string[];
  selectedNoteId?: string | null;
  onSelectNote: (note: ObsidianNoteSummary) => void;
  isDark?: boolean;
  onRefresh?: () => void;
}

export default function NoteExplorer({
  vaultPath,
  scopedFolder,
  scopedTags,
  selectedNoteId,
  onSelectNote,
  isDark = true,
  onRefresh
}: NoteExplorerProps) {
  const [notes, setNotes] = useState<ObsidianNoteSummary[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>(scopedFolder || 'ALL');
  const [selectedTag, setSelectedTag] = useState<string | null>(scopedTags?.[0] || null);

  const fetchVault = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (vaultPath) params.set('vaultPath', vaultPath);
      if (selectedFolder && selectedFolder !== 'ALL') params.set('folder', selectedFolder);
      if (selectedTag) params.set('tag', selectedTag);

      const res = await fetch(`/api/obsidian/notes?${params.toString()}`);
      const data: VaultScanSummary = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to scan Obsidian vault');
      }

      setNotes(data.notes || []);
      setFolders(data.folders || []);
    } catch (err: any) {
      console.error('Failed to load vault notes:', err);
      setError(err.message || 'Error connecting to local Obsidian vault');
    } finally {
      setLoading(false);
    }
  }, [vaultPath, selectedFolder, selectedTag]);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  // Aggregate all unique tags from notes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const n of notes) {
      for (const t of n.tags) {
        tagSet.add(t);
      }
    }
    return Array.from(tagSet).sort();
  }, [notes]);

  // Filter notes by search query locally for responsive typing
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase().trim();
    return notes.filter(n => {
      const inTitle = n.title.toLowerCase().includes(q);
      const inFolder = n.folder.toLowerCase().includes(q);
      const inTags = n.tags.some(t => t.toLowerCase().includes(q));
      return inTitle || inFolder || inTags;
    });
  }, [notes, searchQuery]);

  return (
    <div className="flex flex-col h-full w-full space-y-4 font-sans" data-spatial-container="study-explorer">
      {/* Top Search & Controls Bar */}
      <div className="space-y-2.5">
        <div className="relative flex items-center">
          <Search size={16} className={`absolute left-3.5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search vault notes, tags, or folders..."
            className={`w-full pl-9 pr-9 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition-all outline-none border ${
              isDark 
                ? 'bg-slate-900/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-purple-500 shadow-inner' 
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500 shadow-sm'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 p-1 rounded-full ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Folder Selector Pills */}
        {folders.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedFolder('ALL')}
              className={`flex-shrink-0 px-3 py-1 rounded-xl font-semibold transition-all ${
                selectedFolder === 'ALL'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                  : isDark
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              All Folders ({notes.length})
            </button>

            {folders.map(f => {
              const isSelected = selectedFolder === f;
              const folderName = f.split('/').pop() || f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedFolder(isSelected ? 'ALL' : f)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-xl font-semibold transition-all ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                      : isDark
                        ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  <Folder size={12} className={isSelected ? 'text-white' : 'text-purple-400'} />
                  <span>{folderName}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tag Filter Chips */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
            <span className={`flex items-center gap-1 font-bold uppercase tracking-wider text-[10px] pl-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <Tag size={10} /> Tags:
            </span>
            {allTags.map(tag => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className={`flex-shrink-0 px-2.5 py-0.5 rounded-full font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark
                        ? 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className="text-[10px] font-semibold text-purple-400 hover:underline px-1"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Header Info & Refresh */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5">
          <BookOpen size={14} className="text-purple-500" />
          <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            {filteredNotes.length} {filteredNotes.length === 1 ? 'Note' : 'Notes'} Discovered
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            fetchVault();
            if (onRefresh) onRefresh();
          }}
          disabled={loading}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all active:scale-95 ${
            isDark 
              ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          }`}
          title="Rescan vault folder"
        >
          <RotateCw size={12} className={loading ? 'animate-spin text-purple-400' : ''} />
          <span>Sync Vault</span>
        </button>
      </div>

      {/* Note List Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5 min-h-[220px]">
        {loading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`p-4 rounded-2xl border animate-pulse ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className="h-4 bg-slate-700/50 rounded-md w-3/4 mb-2" />
                <div className="h-3 bg-slate-700/30 rounded-md w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className={`p-6 rounded-3xl border text-center flex flex-col items-center justify-center ${
            isDark ? 'bg-red-950/20 border-red-900/40 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <AlertCircle size={28} className="text-red-400 mb-2" />
            <h4 className="font-bold text-sm mb-1">Vault Discovery Notice</h4>
            <p className="text-xs max-w-xs leading-relaxed opacity-90 mb-3">{error}</p>
            <button
              type="button"
              onClick={fetchVault}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all"
            >
              Retry Sync
            </button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className={`p-8 rounded-3xl border border-dashed text-center flex flex-col items-center justify-center ${
            isDark ? 'border-slate-800 bg-slate-900/30 text-slate-400' : 'border-gray-200 bg-gray-50 text-gray-500'
          }`}>
            <FileText size={32} className="opacity-40 mb-2 text-purple-400" />
            <p className="text-sm font-semibold mb-1">No Notes Found</p>
            <p className="text-xs max-w-xs opacity-75">
              {searchQuery
                ? `No notes matching "${searchQuery}". Try adjusting your filters.`
                : 'Your Obsidian vault does not contain markdown files in this location.'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredNotes.map(note => {
              const isSelected = selectedNoteId === note.id || selectedNoteId === note.relativePath;
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className={`group relative p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? isDark
                        ? 'bg-purple-950/40 border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500'
                        : 'bg-purple-50 border-purple-500/80 shadow-md ring-1 ring-purple-500'
                      : isDark
                        ? 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850 shadow-sm'
                        : 'bg-white border-gray-200/80 hover:border-gray-300 hover:shadow-md shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Note Title */}
                      <h4 className={`text-sm font-bold truncate leading-snug ${
                        isSelected 
                          ? 'text-purple-400 dark:text-purple-300' 
                          : isDark ? 'text-white group-hover:text-purple-300' : 'text-gray-900 group-hover:text-purple-700'
                      }`}>
                        {note.title}
                      </h4>

                      {/* Folder & Word Count Meta */}
                      <div className={`flex items-center gap-2 mt-1.5 text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span className="flex items-center gap-1 truncate max-w-[150px]">
                          <Folder size={11} className="text-purple-400 flex-shrink-0" />
                          {note.folder}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {note.wordCount} words
                        </span>
                        {note.status && (
                          <>
                            <span>•</span>
                            <span className="px-1.5 py-0.2 rounded font-semibold text-[10px] bg-green-500/10 text-green-500">
                              {note.status}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Tags row */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.tags.slice(0, 4).map(tag => (
                            <span
                              key={tag}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                                isDark
                                  ? 'bg-slate-800/90 text-purple-300 border border-purple-900/30'
                                  : 'bg-purple-50 text-purple-700 border border-purple-100'
                              }`}
                            >
                              #{tag}
                            </span>
                          ))}
                          {note.tags.length > 4 && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                              +{note.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center self-center flex-shrink-0 pl-1">
                      <ChevronRight size={16} className={`transition-transform duration-200 ${
                        isSelected 
                          ? 'text-purple-400 translate-x-0.5' 
                          : isDark ? 'text-slate-600 group-hover:text-slate-400' : 'text-gray-300 group-hover:text-gray-600'
                      }`} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
