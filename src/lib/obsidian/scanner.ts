import fs from 'node:fs/promises';
import path from 'node:path';
import type { 
  ParsedObsidianNote, 
  VaultScanSummary, 
  ObsidianNoteSummary, 
  VaultTagCount,
  NoteSearchResult 
} from '@/types/obsidian';
import { parseObsidianMarkdown } from './parser';

export const DEFAULT_VAULT_PATH = 'd:\\AI\\Vaults\\Brain';

/**
 * Validates and sanitizes a relative note path to prevent directory traversal.
 * Returns null if the path is unsafe or attempts to escape the vault root.
 */
export function sanitizeRelativePath(relativePath: string): string | null {
  if (!relativePath || typeof relativePath !== 'string') return null;
  const trimmed = relativePath.trim();
  if (!trimmed) return null;

  // Check for traversal sequences
  const normalized = path.normalize(trimmed);
  if (
    normalized.includes('..') ||
    path.isAbsolute(trimmed) ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('\\') ||
    /^[a-zA-Z]:[\\\/]/.test(trimmed)
  ) {
    return null;
  }

  return normalized.replace(/\\/g, '/');
}

/**
 * Recursively scans an Obsidian vault directory and returns all indexed folders and notes.
 */
export async function scanVaultDirectory(
  vaultRoot = DEFAULT_VAULT_PATH,
  filterFolder?: string,
  filterTag?: string,
  searchQuery?: string
): Promise<VaultScanSummary> {
  const resolvedRoot = path.resolve(vaultRoot);

  try {
    const stat = await fs.stat(resolvedRoot);
    if (!stat.isDirectory()) {
      return { 
        success: false, 
        vaultPath: resolvedRoot, 
        totalNotes: 0, 
        folders: [], 
        notes: [], 
        error: 'NOT_A_DIRECTORY' 
      };
    }
  } catch (err: any) {
    return { 
      success: false, 
      vaultPath: resolvedRoot, 
      totalNotes: 0, 
      folders: [], 
      notes: [], 
      error: 'VAULT_NOT_FOUND' 
    };
  }

  const notesList: ObsidianNoteSummary[] = [];
  const foldersSet = new Set<string>();

  async function walk(dir: string, rel = '') {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '$RECYCLE.BIN') {
        continue;
      }

      const entryRel = rel ? path.join(rel, entry.name) : entry.name;
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const normalizedFolder = entryRel.replace(/\\/g, '/');
        foldersSet.add(normalizedFolder);
        await walk(fullPath, entryRel);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const raw = await fs.readFile(/*turbopackIgnore: true*/ fullPath, 'utf8');
          const normalizedRelPath = entryRel.replace(/\\/g, '/');
          const parsed = parseObsidianMarkdown(raw, normalizedRelPath, fullPath);
          const folderName = rel ? rel.replace(/\\/g, '/') : 'Root';

          // Apply folder filter
          if (filterFolder && folderName !== filterFolder && !folderName.startsWith(filterFolder)) {
            continue;
          }

          // Apply tag filter
          if (filterTag && !parsed.tags.includes(filterTag.replace(/^#/, ''))) {
            continue;
          }

          // Apply search query filter
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesTitle = parsed.title.toLowerCase().includes(q);
            const matchesTag = parsed.tags.some(t => t.toLowerCase().includes(q));
            const matchesBody = parsed.bodyContent.toLowerCase().includes(q);
            if (!matchesTitle && !matchesTag && !matchesBody) {
              continue;
            }
          }

          notesList.push({
            id: parsed.id,
            title: parsed.title,
            relativePath: parsed.relativePath,
            folder: folderName,
            tags: parsed.tags,
            wordCount: parsed.wordCount,
            status: parsed.frontmatter?.status,
            lastModifiedMs: parsed.lastModifiedMs
          });
        } catch (fileErr) {
          console.warn(`Failed to read note file "${fullPath}":`, fileErr);
        }
      }
    }
  }

  await walk(resolvedRoot);

  return {
    success: true,
    vaultPath: resolvedRoot,
    totalNotes: notesList.length,
    folders: Array.from(foldersSet).sort(),
    notes: notesList
  };
}

/**
 * Retrieves and parses a single note by its relative vault path with traversal protection.
 */
export async function getNoteByPath(
  relativePath: string,
  vaultRoot = DEFAULT_VAULT_PATH
): Promise<{ success: boolean; note?: ParsedObsidianNote; error?: string; statusCode: number }> {
  if (!relativePath || relativePath.trim() === '') {
    return { success: false, error: 'PATH_REQUIRED', statusCode: 400 };
  }

  const safeRelPath = sanitizeRelativePath(relativePath);
  if (!safeRelPath) {
    return { success: false, error: 'INVALID_OR_FORBIDDEN_PATH', statusCode: 403 };
  }

  const resolvedRoot = path.resolve(vaultRoot);
  const targetFullPath = path.resolve(resolvedRoot, safeRelPath);

  // Strictly enforce that the target path is inside the vault root
  if (!targetFullPath.startsWith(resolvedRoot)) {
    return { success: false, error: 'INVALID_OR_FORBIDDEN_PATH', statusCode: 403 };
  }

  try {
    const raw = await fs.readFile(/*turbopackIgnore: true*/ targetFullPath, 'utf8');
    const parsed = parseObsidianMarkdown(raw, safeRelPath, targetFullPath);
    return { success: true, note: parsed, statusCode: 200 };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return { success: false, error: 'NOTE_NOT_FOUND', statusCode: 404 };
    }
    return { success: false, error: err.message || 'INTERNAL_ERROR', statusCode: 500 };
  }
}

/**
 * Searches across the vault and returns relevant snippet highlights.
 */
export async function searchVaultNotes(
  query: string,
  vaultRoot = DEFAULT_VAULT_PATH,
  filterTag?: string,
  filterFolder?: string
): Promise<{ success: boolean; results: NoteSearchResult[]; error?: string }> {
  if (!query || query.trim() === '') {
    return { success: true, results: [] };
  }

  const scan = await scanVaultDirectory(vaultRoot, filterFolder, filterTag);
  if (!scan.success) {
    return { success: false, results: [], error: scan.error };
  }

  const q = query.toLowerCase().trim();
  const results: NoteSearchResult[] = [];

  for (const noteSummary of scan.notes) {
    const noteDetail = await getNoteByPath(noteSummary.relativePath, vaultRoot);
    if (!noteDetail.success || !noteDetail.note) continue;

    const note = noteDetail.note;
    const matches: string[] = [];
    let score = 0;

    if (note.title.toLowerCase().includes(q)) {
      matches.push(`Title: ${note.title}`);
      score += 10;
    }

    const matchedTags = note.tags.filter(t => t.toLowerCase().includes(q));
    if (matchedTags.length > 0) {
      matches.push(`Tags: #${matchedTags.join(', #')}`);
      score += 5;
    }

    // Snippet extraction from body
    const bodyLower = note.bodyContent.toLowerCase();
    const matchIdx = bodyLower.indexOf(q);
    if (matchIdx !== -1) {
      score += 3;
      const start = Math.max(0, matchIdx - 40);
      const end = Math.min(note.bodyContent.length, matchIdx + q.length + 60);
      const snippet = (start > 0 ? '...' : '') + note.bodyContent.slice(start, end).replace(/\r?\n/g, ' ') + (end < note.bodyContent.length ? '...' : '');
      matches.push(snippet);
    }

    if (matches.length > 0) {
      results.push({
        note: noteSummary,
        matches,
        score
      });
    }
  }

  results.sort((a, b) => (b.score || 0) - (a.score || 0));

  return {
    success: true,
    results
  };
}

/**
 * Aggregates all tags across the vault with their frequency counts.
 */
export async function getVaultTags(
  vaultRoot = DEFAULT_VAULT_PATH
): Promise<{ success: boolean; tags: VaultTagCount[]; error?: string }> {
  const scan = await scanVaultDirectory(vaultRoot);
  if (!scan.success) {
    return { success: false, tags: [], error: scan.error };
  }

  const tagCounts: Record<string, number> = {};
  for (const note of scan.notes) {
    for (const tag of note.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const tagsList: VaultTagCount[] = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    success: true,
    tags: tagsList
  };
}
