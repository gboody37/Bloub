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
  lastModified: number;
  fileHandle?: any;
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
          word_count: parsed.wordCount,
          lastModified: file.lastModified,
          fileHandle: entry
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
      mode: 'readwrite',
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

    // 1. Fetch all existing cloud notes for this user to compare timestamps
    const { data: cloudNotes } = await supabase
      .from('vault_notes')
      .select('path, updated_at, content')
      .eq('user_id', effectiveUserId);
      
    const cloudMap = new Map((cloudNotes || []).map(n => [n.path, n]));
    const payloadToUpload: any[] = [];

    // 2. Iterate discovered local notes and perform 2-Way Merge
    for (const localNote of discoveredNotes) {
      const cleanPath = sanitizeRelativePath(localNote.path) || localNote.path.replace(/\\/g, '/');
      const cloudNote = cloudMap.get(cleanPath);
      let shouldUpload = true;

      if (cloudNote) {
        const cloudTime = new Date(cloudNote.updated_at).getTime();
        const localTime = localNote.lastModified;

        // If cloud is newer, WRITE to local disk!
        if (cloudTime > localTime && localNote.fileHandle && localNote.fileHandle.createWritable) {
          try {
            const writable = await localNote.fileHandle.createWritable();
            await writable.write(cloudNote.content);
            await writable.close();
            shouldUpload = false; // We pulled from cloud, no need to push back up
            console.log(`[Sync] Pulled cloud changes down to local file: ${cleanPath}`);
          } catch (e) {
            console.error(`[Sync] Failed to write to local file ${cleanPath}`, e);
          }
        } else if (localTime <= cloudTime) {
          // They are identical or roughly identical, don't waste bandwidth
          shouldUpload = false;
        }
      }

      if (shouldUpload) {
        payloadToUpload.push({
          user_id: effectiveUserId,
          title: localNote.title,
          content: localNote.content,
          path: cleanPath,
          folder: localNote.folder || 'Root',
          tags: localNote.tags || [],
          word_count: localNote.word_count || 0,
          updated_at: new Date().toISOString()
        });
      }
    }

    // 3. Batch upload the local notes that were newer (or brand new)
    const totalUploadCount = payloadToUpload.length;
    for (let i = 0; i < totalUploadCount; i += batchSize) {
      const batch = payloadToUpload.slice(i, i + batchSize);

      if (onProgress) {
        onProgress({
          status: 'uploading',
          currentFile: batch[batch.length - 1]?.path,
          scannedCount: totalCount,
          uploadedCount,
          totalCount: totalUploadCount
        });
      }

      const { error: upsertErr } = await supabase
        .from('vault_notes')
        .upsert(batch, { onConflict: 'user_id,path' });

      if (upsertErr) {
        const res = await fetch('/api/obsidian/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: batch })
        });
        if (!res.ok) throw new Error('Failed to upload notes batch to Supabase');
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
        word_count: parsed.wordCount,
        lastModified: file.lastModified,
        fileHandle: undefined
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

    // Removed WIPE to prevent data loss during fallback sync

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
