'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, 
  FolderOpen,
  FileText, 
  Search, 
  RotateCw, 
  Clock, 
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Cloud,
  UploadCloud,
  Loader2
} from 'lucide-react';
import type { ObsidianNoteSummary, VaultScanSummary } from '@/types/obsidian';
import { pickAndSyncObsidianVault, syncNotesFromFileList, type SyncProgress } from '@/lib/obsidian/vault-sync';

interface NoteExplorerProps {
  userId?: string;
  scopedFolder?: string;
  scopedTags?: string[];
  selectedNoteId?: string | null;
  onSelectNote: (note: ObsidianNoteSummary) => void;
  isDark?: boolean;
  onRefresh?: () => void;
}

export default function NoteExplorer({
  userId,
  scopedFolder,
  scopedTags,
  selectedNoteId,
  onSelectNote,
  isDark = true,
  onRefresh
}: NoteExplorerProps) {
  const [notes, setNotes] = useState<ObsidianNoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchVault = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (userId) params.set('userId', userId);
      const res = await fetch(`/api/obsidian/notes?${params.toString()}`);
      const data: VaultScanSummary = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load cloud vault');
      
      setNotes(data.notes || []);
      
      // Auto-expand root folders initially
      const initialExpanded: Record<string, boolean> = {};
      const uniqueFolders = Array.from(new Set((data.notes || []).map(n => n.folder || 'Root')));
      uniqueFolders.forEach(f => { initialExpanded[f] = true; });
      setExpandedFolders(initialExpanded);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchVault(); }, [fetchVault]);

  const handleConnectVault = async () => {
    if (!window.showDirectoryPicker) {
      fileInputRef.current?.click();
      return;
    }
    try {
      setIsSyncing(true);
      setError(null);
      await pickAndSyncObsidianVault(setSyncProgress);
      await fetchVault();
      onRefresh?.();
    } catch (err: any) {
      if (err.name !== 'AbortError') setError('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleFallbackFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      setIsSyncing(true);
      setError(null);
      await syncNotesFromFileList(e.target.files, setSyncProgress);
      await fetchVault();
      onRefresh?.();
    } catch (err: any) {
      setError('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.tags?.some(t => t.toLowerCase().includes(q));
      }
      return true;
    });
  }, [notes, searchQuery]);

  const tree = useMemo(() => {
    const grouped: Record<string, ObsidianNoteSummary[]> = {};
    filteredNotes.forEach(n => {
      const folder = n.folder || 'Root';
      if (!grouped[folder]) grouped[folder] = [];
      grouped[folder].push(n);
    });
    return grouped;
  }, [filteredNotes]);

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  return (
    <div className="flex flex-col h-full w-full font-sans" data-spatial-container="study-explorer">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={handleFallbackFileSelect} />

      {/* Header Bar */}
      <div className={`flex items-center justify-between pb-3 mb-3 border-b ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <Cloud size={16} className="text-purple-400" />
          <span className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
            Cloud Vault
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={fetchVault} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`} title="Refresh Vault">
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleConnectVault} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-500 transition-colors text-xs font-bold" title="Sync local folder to cloud">
            <UploadCloud size={14} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Syncing Progress Alert */}
      {isSyncing && syncProgress && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 text-xs font-semibold ${isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
          <Loader2 size={16} className="animate-spin flex-shrink-0" />
          <div className="truncate">
            {syncProgress.status === 'picking' ? 'Selecting folder...' :
             syncProgress.status === 'scanning' ? `Scanning local vault (${syncProgress.scannedCount} files)...` :
             `Uploading to Cloud: ${syncProgress.syncedCount} / ${syncProgress.totalCount} notes...`}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative flex items-center mb-4">
        <Search size={14} className={`absolute left-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes or tags..."
          className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none transition-all ${
            isDark 
              ? 'bg-slate-900/50 border-slate-800 text-white placeholder-slate-500 focus:border-purple-500/50 focus:bg-slate-900' 
              : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:bg-white'
          }`}
        />
      </div>

      {/* File Tree Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-20 opacity-50"><Loader2 className="animate-spin" size={20} /></div>
        ) : error ? (
          <div className={`p-4 rounded-xl text-center text-xs ${isDark ? 'bg-red-950/20 text-red-400' : 'bg-red-50 text-red-600'}`}>{error}</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center p-6 opacity-50 text-xs font-medium">No notes found. Connect your vault to get started!</div>
        ) : (
          Object.entries(tree).sort((a,b) => a[0].localeCompare(b[0])).map(([folder, folderNotes]) => {
            const isExpanded = expandedFolders[folder];
            return (
              <div key={folder} className="mb-2">
                <button 
                  onClick={() => toggleFolder(folder)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-xs font-semibold ${isDark ? 'hover:bg-slate-800/60 text-slate-300' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  {isExpanded ? <ChevronDown size={14} className="opacity-50" /> : <ChevronRight size={14} className="opacity-50" />}
                  {isExpanded ? <FolderOpen size={14} className="text-purple-400" /> : <Folder size={14} className="text-purple-400" />}
                  <span className="truncate">{folder}</span>
                  <span className="ml-auto text-[10px] opacity-40">{folderNotes.length}</span>
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden ml-3 pl-3 border-l border-dashed border-slate-700 mt-1 space-y-0.5"
                    >
                      {folderNotes.map(note => {
                        const isSelected = selectedNoteId === note.id || selectedNoteId === note.relativePath;
                        return (
                          <button
                            key={note.id}
                            onClick={() => onSelectNote(note)}
                            className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                              isSelected 
                                ? 'bg-purple-500/20 text-purple-400 font-bold' 
                                : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            <span className="truncate flex-1">{note.title}</span>
                            {isSelected && <ChevronRight size={12} className="flex-shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
