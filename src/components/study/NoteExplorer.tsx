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
  const docInputRef = useRef<HTMLInputElement>(null);

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

  /**
   * High-Performance Direct Supabase Storage PDF & Document Ingestion
   */
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || userId || '27157bfd-443f-4eea-8431-bf58a74bae8b';

      setSyncProgress({ status: 'uploading', scannedCount: 1, uploadedCount: 0, totalCount: 2 } as any);

      let pdfPublicUrl = '';
      let extractedText = '';

      if (file.name.toLowerCase().endsWith('.pdf')) {
        // 1. Upload binary PDF directly to Supabase Storage 'media' bucket
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `vault_pdfs/${currentUserId}/${Date.now()}_${cleanFileName}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('media')
          .upload(storagePath, file, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadErr) {
          throw new Error(`Storage upload failed: ${uploadErr.message}`);
        }

        // 2. Retrieve Public CDN URL
        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(storagePath);
        pdfPublicUrl = publicUrl;
        setSyncProgress({ status: 'uploading', scannedCount: 1, uploadedCount: 1, totalCount: 2 } as any);

        // 3. Extract text client-side via pdf.js (for AI Quizzes and search index)
        const arrayBuffer = await file.arrayBuffer();
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
        const maxPages = Math.min(pdf.numPages, 50);

        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          extractedText += strings.join(' ') + '\n';
        }

        if (pdf.numPages > 50) {
          extractedText += `\n\n... (Extracted first 50 pages of document for search and AI quizzes)`;
        }
      }

      // 4. Construct clean Markdown note with lightweight public URL in frontmatter
      const title = file.name.replace(/\.[^/.]+$/, '');
      const noteContent = pdfPublicUrl
        ? `---\ntitle: "${title}"\ntype: "pdf"\npdf_url: "${pdfPublicUrl}"\nfile_name: "${file.name}"\nuploaded_at: "${new Date().toISOString()}"\n---\n\n${extractedText}`
        : extractedText;

      const newNote = {
        user_id: currentUserId,
        title: title,
        content: noteContent,
        path: `Documents/${file.name}.md`,
        folder: 'Documents',
        tags: ['document', 'pdf'],
        word_count: extractedText.split(/\s+/).filter(Boolean).length,
        updated_at: new Date().toISOString()
      };

      // 5. Fast, lightweight database upsert (<50KB payload)
      const { error: dbError } = await supabase
        .from('vault_notes')
        .upsert([newNote], { onConflict: 'user_id,path' });

      if (dbError) throw new Error(dbError.message);

      await fetchVault();
      onRefresh?.();
    } catch (err: any) {
      console.error('Document upload error:', err);
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

  return (
    <div className="flex flex-col h-full w-full font-sans" data-spatial-container="study-explorer">
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" {...{webkitdirectory: "", directory: ""}} multiple className="hidden" onChange={handleFallbackFileSelect} />
      <input type="file" accept=".pdf,.doc,.docx" ref={docInputRef} className="hidden" onChange={handleDocumentUpload} />

      {/* Search and Action Toolbar */}
      <div className="relative flex items-center mb-4 gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search books, notes, or tags..."
            className="w-full pl-8 pr-8 py-2.5 text-xs rounded-xl border outline-none transition-all bg-[#241e1a] border-[#382f28] text-[#f5efe6] placeholder-stone-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button 
            onClick={fetchVault} 
            className="p-2.5 rounded-xl transition-all bg-[#241e1a] hover:bg-[#2e2621] border border-[#382f28] text-stone-400 hover:text-stone-200" 
            title="Refresh Vault"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button 
            onClick={() => docInputRef.current?.click()} 
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-sm transition-all text-xs font-bold active:scale-95" 
            title="Upload PDF Document"
          >
            <UploadCloud size={14} />
            <span>PDF</span>
          </button>
          
          <button 
            onClick={handleConnectVault} 
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#241e1a] hover:bg-[#2e2621] border border-[#382f28] text-stone-200 shadow-sm transition-all text-xs font-bold active:scale-95" 
            title="Sync local folder to cloud"
          >
            <RotateCw size={14} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Syncing / Upload Progress Notification */}
      {isSyncing && syncProgress && (
        <div className="mb-4 p-3 rounded-xl flex items-center gap-3 text-xs font-semibold bg-[var(--theme-surface-elevated)] border border-[var(--theme-border)] text-[var(--theme-text-primary)] shadow-md">
          <Loader2 size={16} className="animate-spin flex-shrink-0 text-[var(--theme-primary)]" />
          <div className="truncate">
            {syncProgress.status === 'picking' ? 'Selecting folder...' :
             syncProgress.status === 'scanning' ? `Scanning local vault (${syncProgress.scannedCount} files)...` :
             `Uploading to Cloud: ${syncProgress.uploadedCount} / ${syncProgress.totalCount}...`}
          </div>
        </div>
      )}

      {/* Notes Tree Listing */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {loading ? (
          <div className="flex items-center justify-center h-20 opacity-50"><Loader2 className="animate-spin text-[var(--theme-primary)]" size={20} /></div>
        ) : error ? (
          <div className="p-4 rounded-xl text-center text-xs bg-red-950/20 border border-red-500/30 text-red-400">{error}</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center p-6 text-xs font-medium text-[var(--theme-text-muted)]">No notes found. Upload a PDF or sync your vault to start!</div>
        ) : (
          <div className="space-y-6 pb-6">
            {Object.entries(tree).sort((a,b) => a[0].localeCompare(b[0])).map(([folder, folderNotes]) => (
              <div key={folder}>
                <div className="flex items-center gap-2 mb-3 pl-1">
                  <FolderOpen size={16} className="text-[var(--theme-primary)]" />
                  <h4 className="text-sm font-bold tracking-tight text-[var(--theme-text-primary)]">{folder}</h4>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--theme-surface-elevated)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-muted)]">{folderNotes.length}</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {folderNotes.map(note => {
                    const isSelected = selectedNoteId === note.id || selectedNoteId === note.relativePath;
                    return (
                      <div key={note.id} className="relative group/note w-full">
                        <button
                          onClick={() => onSelectNote(note)}
                          className={`w-full flex flex-col items-start text-left p-3.5 rounded-2xl transition-all duration-200 border ${
                            isSelected 
                              ? 'bg-[var(--theme-primary)]/15 border-[var(--theme-primary)] shadow-[0_0_15px_var(--theme-focus-ring)] scale-[0.98]' 
                              : 'bg-[var(--theme-surface-subtle)] border-[var(--theme-border-subtle)] hover:bg-[var(--theme-surface-elevated)] hover:border-[var(--theme-border)] hover:shadow-md'
                          }`}
                        >
                          <div className="w-full flex justify-between items-start mb-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${
                              isSelected 
                                ? 'bg-[var(--theme-primary)]/25 border-[var(--theme-primary)]/40 text-[var(--theme-primary)]' 
                                : 'bg-[var(--theme-surface-elevated)] border-[var(--theme-border-subtle)] text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text-primary)]'
                            }`}>
                              <FileText size={18} />
                            </div>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm('Delete this note?')) return;
                                try {
                                  const deleteQuery = supabase.from('vault_notes').delete().eq('path', note.relativePath || note.id);
                                  if (userId) deleteQuery.eq('user_id', userId);
                                  const { error: deleteError } = await deleteQuery;
                                  if (deleteError) throw new Error(deleteError.message);
                                  await fetchVault();
                                } catch (err: any) {
                                  alert('Failed to delete: ' + err.message);
                                }
                              }}
                              className="p-1.5 rounded-lg opacity-0 group-hover/note:opacity-100 transition-all hover:bg-red-500/20 text-red-400"
                              title="Delete note"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                          </div>
                          <h5 className={`text-xs font-bold truncate w-full mb-1 ${isSelected ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-primary)]'}`}>{note.title}</h5>
                          {note.tags && note.tags.length > 0 && (
                            <span className="text-[9px] font-bold uppercase tracking-wider truncate w-full mt-auto text-[var(--theme-text-muted)]">
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
