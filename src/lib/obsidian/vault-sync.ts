import { parseObsidianMarkdown } from './parser';
import { sanitizeRelativePath } from './scanner';
import { createClient } from '@/lib/supabase/client';

export interface SyncProgress {
  status: 'idle' | 'picking' | 'scanning' | 'uploading' | 'completed' | 'error';
  currentFile?: string;
  scannedCount: number;
  uploadedCount: number;
  totalCount: number;
  error?: string;
}

export interface DiscoveredMarkdownNote {
  path: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  word_count: number;
}

/**
 * Recursively scans a FileSystemDirectoryHandle for markdown (.md) files.
 */
async function scanDirectoryHandleRecursively(
  dirHandle: any,
  currentPath = '',
  onProgress?: (progress: SyncProgress) => void,
  collected: DiscoveredMarkdownNote[] = []
): Promise<DiscoveredMarkdownNote[]> {
  for await (const entry of dirHandle.values()) {
    // Ignore hidden directories (.obsidian, .git), node_modules, and system folders
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '$RECYCLE.BIN') {
      continue;
    }

    const entryRelativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

    if (entry.kind === 'directory') {
      await scanDirectoryHandleRecursively(entry, entryRelativePath, onProgress, collected);
    } else if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.md')) {
      try {
        const file = await entry.getFile();
        const text = await file.text();
        const parsed = parseObsidianMarkdown(text, entryRelativePath);
        const folderName = currentPath || 'Root';

        collected.push({
          path: entryRelativePath,
          title: parsed.title,
          content: text,
          folder: folderName,
          tags: parsed.tags,
          word_count: parsed.wordCount
        });

        if (onProgress) {
          onProgress({
            status: 'scanning',
            currentFile: entryRelativePath,
            scannedCount: collected.length,
            uploadedCount: 0,
            totalCount: collected.length
          });
        }
      } catch (fileErr) {
        console.warn(`Could not read file ${entryRelativePath}:`, fileErr);
      }
    }
  }

  return collected;
}

/**
 * Opens browser directory picker and syncs all markdown notes into Supabase `vault_notes`.
 */
export async function pickAndSyncObsidianVault(
  userId?: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  // Verify showDirectoryPicker support
  if (typeof window === 'undefined' || !(window as any).showDirectoryPicker) {
    return {
      success: false,
      syncedCount: 0,
      error: 'FILE_SYSTEM_API_NOT_SUPPORTED'
    };
  }

  try {
    if (onProgress) {
      onProgress({
        status: 'picking',
        scannedCount: 0,
        uploadedCount: 0,
        totalCount: 0
      });
    }

    const dirHandle = await (window as any).showDirectoryPicker({
      id: 'obsidian_vault_picker',
      mode: 'read',
      startIn: 'documents'
    });

    if (onProgress) {
      onProgress({
        status: 'scanning',
        scannedCount: 0,
        uploadedCount: 0,
        totalCount: 0
      });
    }

    const discoveredNotes = await scanDirectoryHandleRecursively(dirHandle, '', onProgress);

    if (discoveredNotes.length === 0) {
      if (onProgress) {
        onProgress({
          status: 'completed',
          scannedCount: 0,
          uploadedCount: 0,
          totalCount: 0
        });
      }
      return { success: true, syncedCount: 0 };
    }

    const totalCount = discoveredNotes.length;
    let uploadedCount = 0;
    const batchSize = 25;

    const supabase = createClient();
    const effectiveUserId = userId || (await supabase.auth.getUser()).data.user?.id;

    if (!effectiveUserId) {
      throw new Error('User must be logged in to sync vault notes to Supabase.');
    }

    for (let i = 0; i < totalCount; i += batchSize) {
      const batch = discoveredNotes.slice(i, i + batchSize);
      const payload = batch.map(n => {
        const cleanPath = sanitizeRelativePath(n.path) || n.path.replace(/\\/g, '/');
        return {
          user_id: effectiveUserId,
          title: n.title,
          content: n.content,
          path: cleanPath,
          folder: n.folder || 'Root',
          tags: n.tags || [],
          word_count: n.word_count || 0,
          updated_at: new Date().toISOString()
        };
      });

      if (onProgress) {
        onProgress({
          status: 'uploading',
          currentFile: batch[batch.length - 1]?.path,
          scannedCount: totalCount,
          uploadedCount,
          totalCount
        });
      }

      // Upsert into Supabase vault_notes
      const { error: upsertErr } = await supabase
        .from('vault_notes')
        .upsert(payload, { onConflict: 'user_id,path' });

      if (upsertErr) {
        console.error('Error during vault batch upsert:', upsertErr);
        // Fallback to API route if direct upsert fails
        const res = await fetch('/api/obsidian/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: payload })
        });
        if (!res.ok) {
          throw new Error(upsertErr.message || 'Failed to upload notes batch to Supabase');
        }
      }

      uploadedCount += batch.length;

      if (onProgress) {
        onProgress({
          status: 'uploading',
          scannedCount: totalCount,
          uploadedCount,
          totalCount
        });
      }
    }

    if (onProgress) {
      onProgress({
        status: 'completed',
        scannedCount: totalCount,
        uploadedCount: totalCount,
        totalCount
      });
    }

    return { success: true, syncedCount: totalCount };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, syncedCount: 0, error: 'USER_CANCELLED' };
    }
    console.error('Failed to sync Obsidian vault:', err);
    if (onProgress) {
      onProgress({
        status: 'error',
        scannedCount: 0,
        uploadedCount: 0,
        totalCount: 0,
        error: err.message || 'Sync failed'
      });
    }
    return { success: false, syncedCount: 0, error: err.message || 'UNKNOWN_ERROR' };
  }
}

/**
 * Fallback note importer from HTML5 FileList (for browsers without File System Access API)
 */
export async function syncNotesFromFileList(
  files: FileList | File[],
  userId?: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  try {
    const mdFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.md'));
    if (mdFiles.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    if (onProgress) {
      onProgress({
        status: 'scanning',
        scannedCount: 0,
        uploadedCount: 0,
        totalCount: mdFiles.length
      });
    }

    const discoveredNotes: DiscoveredMarkdownNote[] = [];
    for (let idx = 0; idx < mdFiles.length; idx++) {
      const file = mdFiles[idx];
      const rawRelPath = (file as any).webkitRelativePath || file.name;
      const relPath = rawRelPath.replace(/\\/g, '/');
      const text = await file.text();
      const parsed = parseObsidianMarkdown(text, relPath);
      const parts = relPath.split('/');
      parts.pop();
      const folderName = parts.join('/') || 'Root';

      discoveredNotes.push({
        path: relPath,
        title: parsed.title,
        content: text,
        folder: folderName,
        tags: parsed.tags,
        word_count: parsed.wordCount
      });

      if (onProgress) {
        onProgress({
          status: 'scanning',
          currentFile: relPath,
          scannedCount: discoveredNotes.length,
          uploadedCount: 0,
          totalCount: mdFiles.length
        });
      }
    }

    const supabase = createClient();
    const effectiveUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!effectiveUserId) {
      throw new Error('User must be logged in to sync vault notes.');
    }

    // WIPE existing vault notes for this user so we completely replace the old vault
    await supabase.from('vault_notes').delete().eq('user_id', effectiveUserId);

    const totalCount = discoveredNotes.length;
    let uploadedCount = 0;
    const batchSize = 50;

    for (let i = 0; i < totalCount; i += batchSize) {
      const batch = discoveredNotes.slice(i, i + batchSize);
      const payload = batch.map(n => {
        const cleanPath = sanitizeRelativePath(n.path) || n.path.replace(/\\/g, '/');
        return {
          user_id: effectiveUserId,
          title: n.title,
          content: n.content,
          path: cleanPath,
          folder: n.folder || 'Root',
          tags: n.tags || [],
          word_count: n.word_count || 0,
          updated_at: new Date().toISOString()
        };
      });

      if (onProgress) {
        onProgress({
          status: 'uploading',
          currentFile: batch[batch.length - 1]?.path,
          scannedCount: totalCount,
          uploadedCount,
          totalCount
        });
      }

      const { error: upsertErr } = await supabase
        .from('vault_notes')
        .upsert(payload, { onConflict: 'user_id,path' });

      if (upsertErr) {
        console.error('Error during fallback file list batch upsert:', upsertErr);
        const res = await fetch('/api/obsidian/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: payload })
        });
        if (!res.ok) {
          throw new Error(upsertErr.message || 'Failed to upload notes batch to Supabase');
        }
      }

      uploadedCount += batch.length;

      if (onProgress) {
        onProgress({
          status: 'uploading',
          scannedCount: totalCount,
          uploadedCount,
          totalCount
        });
      }
    }

    if (onProgress) {
      onProgress({
        status: 'completed',
        scannedCount: totalCount,
        uploadedCount: totalCount,
        totalCount
      });
    }

    return { success: true, syncedCount: totalCount };
  } catch (err: any) {
    if (onProgress) {
      onProgress({
        status: 'error',
        scannedCount: 0,
        uploadedCount: 0,
        totalCount: 0,
        error: err.message || 'Import failed'
      });
    }
    return { success: false, syncedCount: 0, error: err.message };
  }
}
