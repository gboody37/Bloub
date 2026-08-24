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
import { createClient } from '@/lib/supabase/client';

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
  const supabase = createClient();
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

  const docInputRef = useRef<HTMLInputElement>(null);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
        try {
        setSyncProgress({ status: 'scanning', scannedCount: 1, uploadedCount: 0, totalCount: 1 } as any);
        
        const arrayBuffer = await file.arrayBuffer();
        
        let pdfPublicUrl = '';
        if (file.name.toLowerCase().endsWith('.pdf')) {
          setSyncProgress({ status: 'uploading', scannedCount: 1, uploadedCount: 1, totalCount: 2 } as any);
          const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('media')
              .upload(`pdfs/${fileName}`, file);
            
            if (uploadError) {
              throw new Error(`Storage upload failed: ${uploadError.message}`);
            }

            if (uploadData) {
              const { data: urlData } = supabase.storage.from('media').getPublicUrl(`pdfs/${fileName}`);
              pdfPublicUrl = urlData.publicUrl;
            }
        }
        
        let pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          pdfjsLib = (window as any).pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
        const pdf = await loadingTask.promise;
        let text = pdfPublicUrl ? `---\npdf_url: ${pdfPublicUrl}\n---\n\n` : '';
        const maxPages = Math.min(pdf.numPages, 50); // Extract up to 50 pages to prevent browser crash
        
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          text += strings.join(' ') + '\n';
          setSyncProgress({ status: 'uploading', scannedCount: 1, uploadedCount: i, totalCount: maxPages } as any);
        }
        
        if (pdf.numPages > 50) {
          text += `\n\n... (Extracted first 50 pages of the book to prevent memory limits)`;
        }
        
        const title = file.name.replace(/\.[^/.]+$/, "");
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error('Not logged in');
        
        const newNote = {
        user_id: user.id,
        title: title,
        content: text,
        path: `Documents/${file.name}.md`,
        folder: 'Documents',
        tags: ['document', 'pdf'],
        word_count: text.split(/\s+/).length,
        updated_at: new Date().toISOString()
      };
      
            const { error: dbError } = await supabase.from('vault_notes').upsert([newNote], { onConflict: 'user_id,path' });
        if (dbError) throw new Error(dbError.message);
      
      await fetchVault();
    } catch (err: any) {
      alert('Failed to upload document: ' + err.message);
    } finally {
      setSyncProgress(null);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleConnectVault = async () => {
    if (!(window as any).showDirectoryPicker) {
      fileInputRef.current?.click();
      return;
    }
    try {
      setIsSyncing(true);
      setError(null);
      await pickAndSyncObsidianVault(userId, setSyncProgress);
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
      await syncNotesFromFileList(e.target.files, userId, setSyncProgress);
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
      <input ref={fileInputRef} type="file" {...{webkitdirectory: "", directory: ""}} multiple className="hidden" onChange={handleFallbackFileSelect} />

      {/* Search and Actions */}
      <div className="relative flex items-center mb-4 gap-2">
        <div className="relative flex-1">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or tags..."
            className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border outline-none transition-all ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-gray-800'
            }`}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={fetchVault} className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`} title="Refresh Vault">
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <input type="file" accept=".pdf,.doc,.docx" ref={docInputRef} className="hidden" onChange={handleDocumentUpload} />
          <button onClick={() => docInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all text-xs font-bold" title="Upload PDF/Doc">
            <UploadCloud size={14} />
            <span>PDF</span>
          </button>
          <button onClick={handleConnectVault} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all text-xs font-bold" title="Sync local folder to cloud">
            <RotateCw size={14} />
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
             `Uploading to Cloud: ${syncProgress.uploadedCount} / ${syncProgress.totalCount} notes...`}
          </div>
        </div>
      )}

      {/* Notes Grid Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {loading ? (
          <div className="flex items-center justify-center h-20 opacity-50"><Loader2 className="animate-spin" size={20} /></div>
        ) : error ? (
          <div className={`p-4 rounded-xl text-center text-xs ${isDark ? 'bg-red-950/20 text-red-400' : 'bg-red-50 text-red-600'}`}>{error}</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center p-6 opacity-50 text-xs font-medium">No notes found. Connect your vault to get started!</div>
        ) : (
          <div className="space-y-6 pb-6">
            {Object.entries(tree).sort((a,b) => a[0].localeCompare(b[0])).map(([folder, folderNotes]) => (
              <div key={folder}>
                <div className="flex items-center gap-2 mb-3 pl-1">
                  <FolderOpen size={16} className={isDark ? 'text-indigo-400' : 'text-indigo-500'} />
                  <h4 className={`text-sm font-bold tracking-tight ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{folder}</h4>
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>{folderNotes.length}</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {folderNotes.map(note => {
                    const isSelected = selectedNoteId === note.id || selectedNoteId === note.relativePath;
                    return (
                        <div className="relative group/note w-full">
                          <button
                            key={note.id}
                            onClick={() => onSelectNote(note)}
                            className={`w-full flex flex-col items-start text-left p-3.5 rounded-2xl transition-all duration-300 border ${
                              isSelected 
                                ? (isDark ? 'bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-indigo-50 border-indigo-200 shadow-sm scale-[0.98]') 
                                : (isDark ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm')
                            }`}
                          >
                            <div className="w-full flex justify-between items-start mb-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                isSelected 
                                  ? (isDark ? 'bg-indigo-500/30' : 'bg-indigo-100')
                                  : (isDark ? 'bg-slate-700/50 group-hover:bg-slate-700' : 'bg-gray-50 group-hover:bg-gray-100')
                              }`}>
                                <FileText size={18} className={isSelected ? 'text-indigo-500' : (isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-gray-400 group-hover:text-gray-600')} />
                              </div>
                              <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!confirm('Delete this note?')) return;
                                    try {
                                      // If it's a PDF, try to delete the file from storage first
                                      const { data: fullNote } = await supabase.from('vault_notes').select('content').eq('path', note.relativePath || note.id).single();
                                      if (fullNote?.content?.includes('pdf_url:')) {
                                        const urlMatch = fullNote.content.match(/pdf_url:\s*(.+)/);
                                        if (urlMatch && urlMatch[1]) {
                                          try {
                                            const url = new URL(urlMatch[1].trim());
                                            const pathParts = url.pathname.split('/');
                                            const fileName = pathParts[pathParts.length - 1];
                                            if (fileName) {
                                              await supabase.storage.from('media').remove([`pdfs/${fileName}`]);
                                            }
                                          } catch (e) {
                                            console.error('Failed to parse or delete PDF from storage:', e);
                                          }
                                        }
                                      }

                                      const deleteQuery = supabase.from('vault_notes').delete().eq('path', note.relativePath || note.id);
                                      if (userId) deleteQuery.eq('user_id', userId);
                                      const { error: deleteError } = await deleteQuery;
                                      if (deleteError) throw new Error(deleteError.message);
                                      await fetchVault();
                                    } catch (err: any) {
                                      alert('Failed to delete: ' + err.message);
                                    }
                                  }}
                                className={`p-1.5 rounded-lg opacity-0 group-hover/note:opacity-100 transition-all ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              </button>
                            </div>
                            <h5 className={`text-xs font-bold truncate w-full mb-1 ${isSelected ? (isDark ? 'text-indigo-300' : 'text-indigo-700') : (isDark ? 'text-slate-300 group-hover:text-white' : 'text-gray-800')}`}>{note.title}</h5>
                            {note.tags && note.tags.length > 0 && (
                              <span className={`text-[9px] font-bold uppercase tracking-wider truncate w-full mt-auto ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                {note.tags.join(', ')}
                              </span>
                            )}
                          </button>
                        </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
