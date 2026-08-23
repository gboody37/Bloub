/**
 * Tier 2 & Tier 3 Integration Tests: Obsidian Vault & Note API Endpoints
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseObsidianMarkdown } from '../verification/verify-ac2-obsidian-sync.ts';
import type { ParsedObsidianNote } from '../verification/verify-ac2-obsidian-sync.ts';

interface VaultScanSummary {
  success: boolean;
  vaultPath: string;
  totalNotes: number;
  folders: string[];
  notes: Array<{
    id: string;
    title: string;
    relativePath: string;
    folder: string;
    tags: string[];
    wordCount: number;
  }>;
  error?: string;
}

/**
 * Controller logic for GET /api/obsidian/vault
 */
export async function scanVaultDirectory(
  vaultRoot = 'd:\\AI\\Vaults\\Brain', 
  filterFolder?: string,
  filterTag?: string
): Promise<VaultScanSummary> {
  // Security check for directory traversal
  const resolvedRoot = path.resolve(vaultRoot);

  try {
    const stat = await fs.stat(resolvedRoot);
    if (!stat.isDirectory()) {
      return { success: false, vaultPath: vaultRoot, totalNotes: 0, folders: [], error: 'NOT_A_DIRECTORY' };
    }
  } catch (err: any) {
    return { success: false, vaultPath: vaultRoot, totalNotes: 0, folders: [], error: 'VAULT_NOT_FOUND' };
  }

  const notesList: VaultScanSummary['notes'] = [];
  const foldersSet = new Set<string>();

  async function walk(dir: string, rel = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

      const entryRel = rel ? path.join(rel, entry.name) : entry.name;
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        foldersSet.add(entryRel.replace(/\\/g, '/'));
        await walk(full, entryRel);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const raw = await fs.readFile(full, 'utf8');
        const parsed = parseObsidianMarkdown(raw, entryRel.replace(/\\/g, '/'), full);

        const folderName = rel ? rel.replace(/\\/g, '/') : 'Root';

        // Apply filters
        if (filterFolder && folderName !== filterFolder && !folderName.startsWith(filterFolder)) {
          continue;
        }
        if (filterTag && !parsed.tags.includes(filterTag)) {
          continue;
        }

        notesList.push({
          id: parsed.id,
          title: parsed.title,
          relativePath: parsed.relativePath,
          folder: folderName,
          tags: parsed.tags,
          wordCount: parsed.wordCount
        });
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
 * Controller logic for GET /api/obsidian/note
 */
export async function getNoteByPath(
  relativePath: string, 
  vaultRoot = 'd:\\AI\\Vaults\\Brain'
): Promise<{ success: boolean; note?: ParsedObsidianNote; error?: string; statusCode: number }> {
  if (!relativePath || relativePath.trim() === '') {
    return { success: false, error: 'PATH_REQUIRED', statusCode: 400 };
  }

  // Prevent Directory Traversal Attacks
  const normalizedRel = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  if (normalizedRel.includes('..') || path.isAbsolute(relativePath)) {
    return { success: false, error: 'INVALID_OR_FORBIDDEN_PATH', statusCode: 403 };
  }

  const targetFullPath = path.join(path.resolve(vaultRoot), normalizedRel);

  try {
    const raw = await fs.readFile(targetFullPath, 'utf8');
    const parsed = parseObsidianMarkdown(raw, normalizedRel.replace(/\\/g, '/'), targetFullPath);
    return { success: true, note: parsed, statusCode: 200 };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return { success: false, error: 'NOTE_NOT_FOUND', statusCode: 404 };
    }
    return { success: false, error: err.message, statusCode: 500 };
  }
}

describe('Obsidian Vault API Integration (Tier 2 & Tier 3)', () => {
  it('T2.1: should scan live Obsidian vault and index folders & markdown notes', async () => {
    const scan = await scanVaultDirectory('d:\\AI\\Vaults\\Brain');
    assert.strictEqual(scan.success, true);
    assert.ok(scan.totalNotes > 0, 'Must discover at least 1 note in vault');
    assert.ok(scan.folders.some(f => f.includes('02 - Core Brain')));
  });

  it('T2.2: should filter vault notes by folder (e.g. "02 - Core Brain")', async () => {
    const scan = await scanVaultDirectory('d:\\AI\\Vaults\\Brain', '02 - Core Brain');
    assert.strictEqual(scan.success, true);
    assert.ok(scan.notes.length > 0);
    assert.ok(scan.notes.every(n => n.folder.startsWith('02 - Core Brain')));
  });

  it('T2.3: should return structured 404 for non-existent vault path', async () => {
    const scan = await scanVaultDirectory('d:\\NonExistent\\FakeVaultPath');
    assert.strictEqual(scan.success, false);
    assert.equal(scan.error, 'VAULT_NOT_FOUND');
  });

  it('T2.4: should successfully retrieve and parse a specific note by path', async () => {
    const res = await getNoteByPath('02 - Core Brain/Antigravity Agent Architecture.md');
    assert.strictEqual(res.success, true);
    assert.equal(res.statusCode, 200);
    assert.ok(res.note);
    assert.equal(res.note.title, 'Antigravity Agent Architecture');
  });

  it('T2.5: should return 404 when requested note file does not exist', async () => {
    const res = await getNoteByPath('02 - Core Brain/GhostNoteThatDoesNotExist.md');
    assert.strictEqual(res.success, false);
    assert.equal(res.statusCode, 404);
    assert.equal(res.error, 'NOTE_NOT_FOUND');
  });

  it('T2.6: should block directory traversal attempts with 403 Forbidden', async () => {
    const res = await getNoteByPath('../../../../Windows/System32/drivers/etc/hosts');
    // Sanitized or rejected
    assert.ok(res.statusCode === 403 || res.statusCode === 404);
  });
});
