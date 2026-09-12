import type { 
  ParsedObsidianNote, 
  VaultScanSummary, 
  ObsidianNoteSummary, 
  VaultTagCount, 
  NoteSearchResult 
} from '@/types/obsidian';
import { parseObsidianMarkdown, updateFrontmatterField, applyPdfNotesToContent, applyFrontmatterUpdatesToContent } from './parser';
import { supabase as defaultSupabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_VAULT_PATH = 'Cloud Vault';

/**
 * Validates and normalizes a relative note path to ensure safe formatting.
 * Returns null if the path is invalid or empty.
 */
export function sanitizeRelativePath(relativePath: string): string | null {
  if (!relativePath || typeof relativePath !== 'string') return null;
  const trimmed = relativePath.trim();
  if (!trimmed) return null;

  // Clean and normalize slashes
  let normalized = trimmed.replace(/\\/g, '/').replace(/\/+/g, '/');

  // Prevent parent traversal sequences or absolute paths with drive letters
  if (
    normalized.includes('../') ||
    normalized.includes('/..') ||
    normalized === '..' ||
    normalized.startsWith('/') ||
    /^[a-zA-Z]:/.test(normalized)
  ) {
    return null;
  }

  // Strip leading './' and inner '/./'
  normalized = normalized.replace(/^(\.\/)+/, '').replace(/\/\.\//g, '/');

  return normalized || null;
}

export interface VaultNoteDbRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  path: string;
  folder?: string;
  tags?: string[];
  word_count?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetches and indexes folders and notes from Supabase `vault_notes` table.
 */
export async function scanVaultDirectory(
  vaultRoot = DEFAULT_VAULT_PATH,
  filterFolder?: string,
  filterTag?: string,
  searchQuery?: string,
  userId?: string,
  client: SupabaseClient = defaultSupabase
): Promise<VaultScanSummary> {
  try {
    let query = client.from('vault_notes').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (filterFolder && filterFolder !== 'ALL') {
      const normalizedFolder = filterFolder.replace(/\\/g, '/');
      const q = JSON.stringify(normalizedFolder);
      const ql = JSON.stringify(normalizedFolder + '/%');
      query = query.or(`folder.eq.${q},folder.like.${ql}`);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('Failed to query vault_notes from Supabase:', error);
      return {
        success: false,
        vaultPath: vaultRoot,
        totalNotes: 0,
        folders: [],
        notes: [],
        error: error.message || 'DATABASE_ERROR'
      };
    }

    const rawRows = (rows || []) as VaultNoteDbRow[];
    const notesList: ObsidianNoteSummary[] = [];
    const foldersSet = new Set<string>();

    for (const row of rawRows) {
      const notePath = row.path || '';
      const folderName = row.folder || 'Root';

      if (folderName && folderName !== 'Root') {
        foldersSet.add(folderName);
      }

      // Check tag filter
      const noteTags = row.tags || [];
      if (filterTag) {
        const cleanFilterTag = filterTag.replace(/^#/, '');
        if (!noteTags.some(t => t.toLowerCase() === cleanFilterTag.toLowerCase())) {
          continue;
        }
      }

      // Check search query filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const qWords = q.split(/\s+/).filter(Boolean);
        const titleLower = (row.title || '').toLowerCase();
        const contentLower = (row.content || '').toLowerCase();
        const folderLower = folderName.toLowerCase();

        const matchesTitle = titleLower.includes(q) || (qWords.length > 1 && qWords.every(w => titleLower.includes(w)));
        const matchesTags = noteTags.some(t => t.toLowerCase().includes(q) || (qWords.length > 1 && qWords.every(w => t.toLowerCase().includes(w))));
        const matchesContent = contentLower.includes(q) || (qWords.length > 1 && qWords.every(w => contentLower.includes(w)));
        const matchesFolder = folderLower.includes(q);

        if (!matchesTitle && !matchesTags && !matchesContent && !matchesFolder) {
          continue;
        }
      }

      const lastModifiedMs = row.updated_at
        ? new Date(row.updated_at).getTime()
        : row.created_at
          ? new Date(row.created_at).getTime()
          : Date.now();

      notesList.push({
        id: notePath || row.id,
        title: row.title || 'Untitled',
        relativePath: notePath,
        folder: folderName,
        tags: noteTags,
        wordCount: row.word_count || (row.content ? row.content.trim().split(/\s+/).filter(Boolean).length : 0),
        status: undefined,
        lastModifiedMs
      });
    }

    return {
      success: true,
      vaultPath: vaultRoot,
      totalNotes: notesList.length,
      folders: Array.from(foldersSet).sort(),
      notes: notesList
    };
  } catch (err: any) {
    console.error('Error in scanVaultDirectory:', err);
    return {
      success: false,
      vaultPath: vaultRoot,
      totalNotes: 0,
      folders: [],
      notes: [],
      error: err.message || 'INTERNAL_ERROR'
    };
  }
}

/**
 * Retrieves and parses a single note by its relative vault path from Supabase `vault_notes`.
 */
export async function getNoteByPath(
  relativePath: string,
  vaultRoot = DEFAULT_VAULT_PATH,
  userId?: string,
  client: SupabaseClient = defaultSupabase
): Promise<{ success: boolean; note?: ParsedObsidianNote; error?: string; statusCode: number }> {
  if (!relativePath || relativePath.trim() === '') {
    return { success: false, error: 'PATH_REQUIRED', statusCode: 400 };
  }

  const safeRelPath = sanitizeRelativePath(relativePath);
  if (!safeRelPath) {
    return { success: false, error: 'INVALID_OR_FORBIDDEN_PATH', statusCode: 403 };
  }

  try {
    let query = client.from('vault_notes').select('*').eq('path', safeRelPath);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    let { data: rows, error } = await query;

    if (error) {
      return { success: false, error: error.message, statusCode: 500 };
    }

    // Fallback: If not found by exact path, try searching by title, id (if UUID), or Documents/*.pdf.md
    if (!rows || rows.length === 0) {
      let fallbackQuery = client.from('vault_notes').select('*');
      if (userId) fallbackQuery = fallbackQuery.eq('user_id', userId);
      
      const cleanTitle = safeRelPath.replace(/\.pdf\.md$/i, '').replace(/\.md$/i, '').replace(/^Documents\//i, '');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safeRelPath);

      const orClauses = [
        `title.eq.${cleanTitle}`,
        `title.eq.${safeRelPath}`,
        `path.eq.Documents/${safeRelPath}.pdf.md`,
        `path.eq.Documents/${cleanTitle}.pdf.md`
      ];
      if (isUuid) {
        orClauses.push(`id.eq.${safeRelPath}`);
      }

      const { data: titleRows } = await fallbackQuery.or(orClauses.join(',')).limit(1);

      if (titleRows && titleRows.length > 0) {
        rows = titleRows;
      }
    }

    if (!rows || rows.length === 0) {
      return { success: false, error: 'NOTE_NOT_FOUND', statusCode: 404 };
    }

    const row = rows[0] as VaultNoteDbRow;
    const parsed = parseObsidianMarkdown(row.content || '', safeRelPath, safeRelPath);

    if (row.title && !parsed.title) {
      parsed.title = row.title;
    }
    if (row.folder && parsed.folder === 'Root') {
      parsed.folder = row.folder;
    }
    if (row.tags && row.tags.length > 0 && parsed.tags.length === 0) {
      parsed.tags = row.tags;
    }

    if (row.updated_at || row.created_at) {
      parsed.lastModifiedMs = new Date(row.updated_at || row.created_at!).getTime();
    }

    return { success: true, note: parsed, statusCode: 200 };
  } catch (err: any) {
    return { success: false, error: err.message || 'INTERNAL_ERROR', statusCode: 500 };
  }
}

/**
 * Searches across all notes in Supabase `vault_notes` and returns scored snippet highlights.
 */
export async function searchVaultNotes(
  query: string,
  vaultRoot = DEFAULT_VAULT_PATH,
  filterTag?: string,
  filterFolder?: string,
  userId?: string,
  client: SupabaseClient = defaultSupabase
): Promise<{ success: boolean; results: NoteSearchResult[]; error?: string }> {
  if (!query || query.trim() === '') {
    return { success: true, results: [] };
  }

  try {
    let dbQuery = client.from('vault_notes').select('*');

    if (userId) {
      dbQuery = dbQuery.eq('user_id', userId);
    }

    const { data: rows, error } = await dbQuery;

    if (error) {
      return { success: false, results: [], error: error.message };
    }

    const q = query.toLowerCase().trim();
    const qWords = q.split(/\s+/).filter(Boolean);
    const results: NoteSearchResult[] = [];

    for (const row of (rows || []) as VaultNoteDbRow[]) {
      const folder = row.folder || 'Root';
      if (filterFolder && filterFolder !== 'ALL' && folder !== filterFolder && !folder.startsWith(filterFolder + '/')) {
        continue;
      }

      const tags = row.tags || [];
      if (filterTag && !tags.some(t => t.toLowerCase() === filterTag.replace(/^#/, '').toLowerCase())) {
        continue;
      }

      const noteTitle = row.title || '';
      const rawContent = row.content || '';
      const parsed = parseObsidianMarkdown(rawContent, row.path);

      const matches: string[] = [];
      let score = 0;

      const titleLower = noteTitle.toLowerCase();
      if (titleLower.includes(q)) {
        matches.push(`Title: ${noteTitle}`);
        score += 10;
      } else if (qWords.length > 1 && qWords.every(w => titleLower.includes(w))) {
        matches.push(`Title: ${noteTitle}`);
        score += 8;
      }

      const matchedTags = tags.filter(t => t.toLowerCase().includes(q) || (qWords.length > 1 && qWords.some(w => t.toLowerCase().includes(w))));
      if (matchedTags.length > 0) {
        matches.push(`Tags: #${matchedTags.join(', #')}`);
        score += 5;
      }

      const bodyLower = parsed.bodyContent.toLowerCase();
      let matchIdx = bodyLower.indexOf(q);

      if (matchIdx === -1 && qWords.length > 0) {
        for (const w of qWords) {
          const idx = bodyLower.indexOf(w);
          if (idx !== -1) {
            matchIdx = idx;
            break;
          }
        }
      }

      if (matchIdx !== -1) {
        score += 3;
        const start = Math.max(0, matchIdx - 40);
        const end = Math.min(parsed.bodyContent.length, matchIdx + q.length + 60);
        const snippet = (start > 0 ? '...' : '') + parsed.bodyContent.slice(start, end).replace(/\r?\n/g, ' ') + (end < parsed.bodyContent.length ? '...' : '');
        matches.push(snippet);
      }

      if (matches.length > 0) {
        const lastModifiedMs = row.updated_at
          ? new Date(row.updated_at).getTime()
          : Date.now();

        results.push({
          note: {
            id: row.path || row.id,
            title: noteTitle,
            relativePath: row.path,
            folder,
            tags,
            wordCount: row.word_count || parsed.wordCount,
            status: parsed.frontmatter?.status,
            lastModifiedMs
          },
          matches,
          score
        });
      }
    }

    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    return { success: true, results };
  } catch (err: any) {
    return { success: false, results: [], error: err.message };
  }
}

/**
 * Aggregates all unique tags and counts across the Supabase `vault_notes` table.
 */
export async function getVaultTags(
  vaultRoot = DEFAULT_VAULT_PATH,
  userId?: string,
  client: SupabaseClient = defaultSupabase
): Promise<{ success: boolean; tags: VaultTagCount[]; error?: string }> {
  try {
    let query = client.from('vault_notes').select('tags');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: rows, error } = await query;

    if (error) {
      return { success: false, tags: [], error: error.message };
    }

    const tagCounts: Record<string, number> = {};
    for (const row of rows || []) {
      const tags: string[] = (row as any).tags || [];
      for (const t of tags) {
        if (t) {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        }
      }
    }

    const tagsList: VaultTagCount[] = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return { success: true, tags: tagsList };
  } catch (err: any) {
    return { success: false, tags: [], error: err.message };
  }
}

/**
 * Batch upserts an array of parsed notes to Supabase `vault_notes`.
 */
export async function batchUpsertVaultNotes(
  notes: Array<{
    user_id: string;
    title: string;
    content: string;
    path: string;
    folder?: string;
    tags?: string[];
    word_count?: number;
  }>,
  client: SupabaseClient = defaultSupabase
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!notes || notes.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const payload = notes.map(n => {
      const cleanPath = sanitizeRelativePath(n.path) || n.path.replace(/\\/g, '/');
      return {
        user_id: n.user_id,
        title: n.title,
        content: n.content,
        path: cleanPath,
        folder: n.folder || 'Root',
        tags: n.tags || [],
        word_count: n.word_count || 0,
        updated_at: new Date().toISOString()
      };
    });

    const { data, error } = await client
      .from('vault_notes')
      .upsert(payload, { onConflict: 'user_id,path' })
      .select('id');

    if (error) {
      console.error('Error batch upserting vault notes:', error);
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data?.length || payload.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}

/**
 * Atomically updates PDF annotations in frontmatter without clobbering note body content.
 */
export async function updateNotePdfAnnotations(
  noteIdOrPath: string,
  pdfNotesJson: string,
  userId?: string,
  client: SupabaseClient = defaultSupabase
): Promise<{ success: boolean; note?: ParsedObsidianNote; error?: string; statusCode: number }> {
  if (!noteIdOrPath) {
    return { success: false, error: 'NOTE_ID_OR_PATH_REQUIRED', statusCode: 400 };
  }

  try {
    let query = client.from('vault_notes').select('*');
    if (noteIdOrPath.includes('/') || noteIdOrPath.endsWith('.md') || noteIdOrPath.endsWith('.pdf')) {
      const safeRelPath = sanitizeRelativePath(noteIdOrPath) || noteIdOrPath.replace(/\\/g, '/');
      query = query.eq('path', safeRelPath);
    } else {
      query = query.eq('id', noteIdOrPath);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: rows, error: fetchErr } = await query;
    if (fetchErr) {
      return { success: false, error: fetchErr.message, statusCode: 500 };
    }

    if (!rows || rows.length === 0) {
      return { success: false, error: 'NOTE_NOT_FOUND', statusCode: 404 };
    }

    const row = rows[0] as VaultNoteDbRow;
    const currentContent = row.content || '';
    const updatedContent = applyPdfNotesToContent(currentContent, pdfNotesJson);
    const parsed = parseObsidianMarkdown(updatedContent, row.path, row.path);

    const updatePayload: any = {
      content: updatedContent,
      updated_at: new Date().toISOString()
    };

    let updateQuery = client.from('vault_notes').update(updatePayload);
    if (row.id) {
      updateQuery = updateQuery.eq('id', row.id);
    } else {
      updateQuery = updateQuery.eq('path', row.path);
    }

    const { error: updateErr } = await updateQuery;
    if (updateErr) {
      return { success: false, error: updateErr.message, statusCode: 500 };
    }

    return { success: true, note: parsed, statusCode: 200 };
  } catch (err: any) {
    return { success: false, error: err.message || 'INTERNAL_ERROR', statusCode: 500 };
  }
}

/**
 * Atomically updates multiple frontmatter key/value fields without clobbering note body content.
 */
export async function atomicUpdateNoteFrontmatter(
  noteIdOrPath: string,
  frontmatterUpdates: Record<string, string>,
  userId?: string,
  client: SupabaseClient = defaultSupabase
): Promise<{ success: boolean; note?: ParsedObsidianNote; error?: string; statusCode: number }> {
  if (!noteIdOrPath) {
    return { success: false, error: 'NOTE_ID_OR_PATH_REQUIRED', statusCode: 400 };
  }

  try {
    let query = client.from('vault_notes').select('*');
    if (noteIdOrPath.includes('/') || noteIdOrPath.endsWith('.md') || noteIdOrPath.endsWith('.pdf')) {
      const safeRelPath = sanitizeRelativePath(noteIdOrPath) || noteIdOrPath.replace(/\\/g, '/');
      query = query.eq('path', safeRelPath);
    } else {
      query = query.eq('id', noteIdOrPath);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: rows, error: fetchErr } = await query;
    if (fetchErr) {
      return { success: false, error: fetchErr.message, statusCode: 500 };
    }

    if (!rows || rows.length === 0) {
      return { success: false, error: 'NOTE_NOT_FOUND', statusCode: 404 };
    }

    const row = rows[0] as VaultNoteDbRow;
    const updatedContent = applyFrontmatterUpdatesToContent(row.content || '', frontmatterUpdates);
    const parsed = parseObsidianMarkdown(updatedContent, row.path, row.path);

    const updatePayload: any = {
      content: updatedContent,
      updated_at: new Date().toISOString()
    };

    let updateQuery = client.from('vault_notes').update(updatePayload);
    if (row.id) {
      updateQuery = updateQuery.eq('id', row.id);
    } else {
      updateQuery = updateQuery.eq('path', row.path);
    }

    const { error: updateErr } = await updateQuery;
    if (updateErr) {
      return { success: false, error: updateErr.message, statusCode: 500 };
    }

    return { success: true, note: parsed, statusCode: 200 };
  } catch (err: any) {
    return { success: false, error: err.message || 'INTERNAL_ERROR', statusCode: 500 };
  }
}

export interface FlushNotePayload {
  noteId?: string;
  notePath?: string;
  pdfNotes?: string | Record<string, any>;
  content?: string;
  title?: string;
  folder?: string;
  tags?: string[];
  frontmatterUpdates?: Record<string, string>;
}

/**
 * High-reliability atomic flush handler for beacon / keepalive / offline WAL sync.
 */
export async function atomicFlushNote(
  payload: FlushNotePayload,
  userId?: string,
  client: SupabaseClient = defaultSupabase
): Promise<{ success: boolean; note?: ParsedObsidianNote; count?: number; error?: string; statusCode: number }> {
  const targetIdentifier = payload.noteId || payload.notePath;
  if (!targetIdentifier && !payload.content) {
    return { success: false, error: 'NOTE_IDENTIFIER_REQUIRED', statusCode: 400 };
  }

  const pdfNotesStr = typeof payload.pdfNotes === 'object' && payload.pdfNotes !== null
    ? JSON.stringify(payload.pdfNotes)
    : payload.pdfNotes;

  // 1. If pdfNotes is provided, use atomic frontmatter update
  if (targetIdentifier && pdfNotesStr !== undefined) {
    return updateNotePdfAnnotations(targetIdentifier, pdfNotesStr, userId, client);
  }

  // 2. If general frontmatter updates provided
  if (targetIdentifier && payload.frontmatterUpdates && Object.keys(payload.frontmatterUpdates).length > 0) {
    return atomicUpdateNoteFrontmatter(targetIdentifier, payload.frontmatterUpdates, userId, client);
  }

  // 3. If entire content provided
  if (payload.content !== undefined) {
    const cleanPath = sanitizeRelativePath(payload.notePath || targetIdentifier || 'untitled.md') || (payload.notePath || targetIdentifier || 'untitled.md').replace(/\\/g, '/');
    const result = await batchUpsertVaultNotes([{
      user_id: userId || 'anonymous',
      title: payload.title || 'Untitled',
      content: payload.content,
      path: cleanPath,
      folder: payload.folder || 'Root',
      tags: payload.tags || []
    }], client);

    return {
      success: result.success,
      count: result.count,
      error: result.error,
      statusCode: result.success ? 200 : 500
    };
  }

  return { success: false, error: 'NO_PAYLOAD_CHANGES_PROVIDED', statusCode: 400 };
}

