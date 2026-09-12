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
  Loader2,
  X 
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
  const [isDraggingOver, setIsDraggingOver] = useState(false);
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
  const processDocumentUpload = async (file: File) => {
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

        const { error: uploadErr } = await supabase.storage
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
          if (pdfjsLib?.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
        }

        if (pdfjsLib) {
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
      } else {
        extractedText = await file.text();
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
        tags: file.name.toLowerCase().endsWith('.pdf') ? ['document', 'pdf'] : ['document', 'note'],
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
      onSelectNote({
        id: newNote.path,
        title: newNote.title,
        relativePath: newNote.path,
        folder: newNote.folder,
        tags: newNote.tags,
        wordCount: newNote.word_count,
        lastModifiedMs: Date.now()
      });
    } catch (err: any) {
      console.error('Document upload error:', err);
      alert('Failed to upload document: ' + err.message);
    } finally {
      setSyncProgress(null);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processDocumentUpload(file);
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
    <div 
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDraggingOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processDocumentUpload(file);
      }}
      className="flex flex-col h-full w-full font-sans relative" 
      data-spatial-container="study-explorer"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 rounded-2xl bg-[#181412]/90 border-2 border-dashed border-amber-500 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6 text-center animate-in fade-in duration-150">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
            <UploadCloud className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#f5efe6] tracking-tight">Drop PDF to Upload</h4>
            <p className="text-xs text-amber-300/80 mt-1">Uploads binary to Supabase media bucket &amp; syncs to Vault</p>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" {...{webkitdirectory: "", directory: ""}} multiple className="hidden" onChange={handleFallbackFileSelect} />
      <input type="file" accept=".pdf,.doc,.docx" ref={docInputRef} className="hidden" onChange={handleDocumentUpload} />

      {/* Search and Action Toolbar */}
      <div className="relative flex items-center mb-3 gap-1.5">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-7 pr-7 py-1.5 text-xs rounded-lg border outline-none transition-all bg-[#141417] border-white/[0.08] text-zinc-200 placeholder-zinc-500 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs p-0.5"
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button 
            onClick={fetchVault} 
            className="p-1.5 rounded-lg transition-all bg-[#141417] hover:bg-[#1c1c22] border border-white/[0.08] text-zinc-400 hover:text-zinc-200" 
            title="Refresh Vault"
          >
            <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button 
            onClick={() => docInputRef.current?.click()} 
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] shadow-sm transition-all text-xs font-medium active:scale-95" 
            title="Upload PDF Document"
          >
            <UploadCloud size={13} />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Syncing / Upload Progress Notification */}
      {isSyncing && syncProgress && (
        <div className="mb-3 p-2.5 rounded-lg flex items-center gap-2.5 text-xs font-medium bg-[#141417] border border-white/[0.08] text-zinc-300 shadow-sm">
          <Loader2 size={14} className="animate-spin flex-shrink-0 text-amber-500" />
          <div className="truncate text-[11px]">
            {syncProgress.status === 'picking' ? 'Selecting folder...' :
             syncProgress.status === 'scanning' ? `Scanning local vault (${syncProgress.scannedCount} files)...` :
             `Uploading: ${syncProgress.uploadedCount} / ${syncProgress.totalCount}...`}
          </div>
        </div>
      )}

      {/* Notes Tree Listing */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-20 opacity-50"><Loader2 className="animate-spin text-amber-500" size={18} /></div>
        ) : error ? (
          <div className="p-3 rounded-lg text-center text-xs bg-red-950/20 border border-red-500/20 text-red-400">{error}</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center p-6 text-xs font-medium text-zinc-500">No documents found. Upload a PDF to start!</div>
        ) : (
          <div className="space-y-4 pb-4">
            {Object.entries(tree).sort((a,b) => a[0].localeCompare(b[0])).map(([folder, folderNotes]) => (
              <div key={folder}>
                <div className="flex items-center gap-1.5 mb-2 pl-0.5">
                  <FolderOpen size={13} className="text-zinc-500" />
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{folder}</h4>
                  <span className="ml-auto text-[10px] font-medium px-1.5 py-0.2 rounded bg-white/[0.04] text-zinc-500">{folderNotes.length}</span>
                </div>
                
                <div className="space-y-1.5">
                  {folderNotes.map(note => {
                    const isSelected = selectedNoteId === note.id || selectedNoteId === note.relativePath;
                    return (
                      <div key={note.id} className="relative group/note w-full">
                        <button
                          onClick={() => onSelectNote(note)}
                          className={`w-full flex items-center text-left p-2.5 rounded-lg transition-all duration-150 border gap-2.5 ${
                            isSelected 
                              ? 'bg-white/[0.06] border-amber-500/80 shadow-sm' 
                              : 'bg-[#121215] border-white/[0.06] hover:bg-[#17171c] hover:border-white/[0.1]'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                            isSelected 
                              ? 'bg-amber-500/10 text-amber-400' 
                              : 'bg-white/[0.04] text-zinc-400 group-hover/note:text-zinc-200'
                          }`}>
                            <FileText size={14} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h5 className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-zinc-200'}`}>{note.title}</h5>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
                              <span>{note.title.toLowerCase().endsWith('.pdf') ? 'PDF Document' : 'Note'}</span>
                              {note.wordCount ? <span>• {note.wordCount} words</span> : null}
                            </div>
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
                            className="p-1 rounded opacity-0 group-hover/note:opacity-100 transition-all hover:bg-red-500/20 text-red-400 shrink-0"
                            title="Delete note"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                          </button>
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
