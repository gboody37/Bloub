/**
 * Obsidian Brain Knowledge Vault & Note Types
 */

export interface ObsidianFrontmatter {
  tags?: string[];
  status?: string;
  created?: string;
  modified?: string;
  aliases?: string[];
  [key: string]: any;
}

export interface ObsidianHeading {
  level: number;
  text: string;
  slug: string;
}

export interface ObsidianWikilink {
  raw: string;
  target: string;
  alias?: string;
}

export interface ObsidianNoteSummary {
  id: string;
  title: string;
  relativePath: string;
  folder: string;
  tags: string[];
  wordCount: number;
  status?: string;
  lastModifiedMs?: number;
}

export interface ParsedObsidianNote {
  id: string;
  title: string;
  relativePath: string;
  absolutePath: string;
  folder?: string;
  frontmatter: ObsidianFrontmatter;
  tags: string[];
  headings: ObsidianHeading[];
  wikilinks: ObsidianWikilink[];
  rawContent?: string;
  bodyContent: string;
  wordCount: number;
  lastModifiedMs: number;
}

export type ObsidianNote = ParsedObsidianNote;

export interface VaultScanSummary {
  success: boolean;
  vaultPath: string;
  totalNotes: number;
  folders: string[];
  notes: ObsidianNoteSummary[];
  error?: string;
}

export interface VaultTagCount {
  name: string;
  count: number;
}

export interface NoteSearchResult {
  note: ObsidianNoteSummary;
  matches: string[];
  score?: number;
}
