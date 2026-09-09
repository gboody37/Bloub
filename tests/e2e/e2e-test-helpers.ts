/**
 * E2E Test Suite Helpers, Mocks, and In-Memory Drivers
 * 
 * Provides self-contained test doubles, storage simulators, and mathematical
 * verifiers for the Vibe Todos Creative Overhaul E2E test suite (Tiers 1 - 4).
 * 
 * Target Workspace: vibe-todos
 * Node.js Native Test Runner Compatible
 */

import fs from 'node:fs';
import path from 'node:path';
import { STITCH_THEMES, getThemeToken, type StitchThemeToken } from '../../src/lib/theme/tokens.ts';

// Authoritative lists from specs and bot modules
export const EXPECTED_SHAPES = [
  'cercle', 'galet', 'squircle', 'capsule', 'triangle', 'hexagone',
  'nuage', 'goutte', 'oeuf', 'soleil', 'fromage', 'livre'
];

export const EXPECTED_COLORS = [
  'encre', 'brun', 'rouge', 'orange', 'ambre', 'vert',
  'turquoise', 'bleu', 'violet', 'rose', 'gris', 'creme'
];

export const EXPECTED_STATES = [
  'idle', 'orbit', 'wink', 'alert', 'comet', 'wide', 'sleep', 'thinking',
  'nod', 'shake', 'breathe', 'pulse', 'float', 'listen', 'talk'
];

export const EXPECTED_EXPRESSIONS = [
  'timide', 'neutre', 'heureux', 'hilare', 'surpris', 'fier',
  'colere', 'triste', 'somnolent', 'curieux', 'mefiant', 'blase',
  'attentif', 'effraye', 'concentre', 'clin', 'degoute', 'amuse'
];

export type StateId = (typeof EXPECTED_STATES)[number];
export type ExpressionId = (typeof EXPECTED_EXPRESSIONS)[number];

export const STATE_DURATIONS: Record<string, number> = {
  idle: 0,
  orbit: 3.4,
  wink: 1.2,
  alert: 1.8,
  comet: 2.2,
  wide: 2.0,
  sleep: 0,
  thinking: 2.5,
  nod: 1.4,
  shake: 1.4,
  breathe: 3.0,
  pulse: 1.5,
  float: 2.8,
  listen: 0,
  talk: 2.0
};

// ============================================================================
// 1. IN-MEMORY STORAGE TEST DOUBLES
// ============================================================================

export class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  dump(): Record<string, string> {
    const res: Record<string, string> = {};
    for (const [k, v] of this.store.entries()) {
      res[k] = v;
    }
    return res;
  }
}

export interface BeaconEntry {
  url: string;
  data: any;
  timestamp: number;
}

export class MockBeaconEngine {
  public records: BeaconEntry[] = [];

  sendBeacon(url: string, data: any): boolean {
    let parsedData = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = data;
      }
    }
    this.records.push({
      url,
      data: parsedData,
      timestamp: Date.now()
    });
    return true;
  }

  clear(): void {
    this.records = [];
  }

  get latest(): BeaconEntry | undefined {
    return this.records[this.records.length - 1];
  }
}

// ============================================================================
// 2. IN-MEMORY SUPABASE DATABASE & STORAGE DOUBLE
// ============================================================================

export interface VaultNoteRow {
  id: string;
  user_id: string;
  title: string;
  path: string;
  folder: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export class MockSupabaseDatabase {
  public vaultNotes = new Map<string, VaultNoteRow>();
  public userMetadata: Record<string, any> = {};
  public mediaStorage = new Map<string, { buffer: Buffer | string; contentType: string }>();

  constructor() {
    this.seedDefaults();
  }

  seedDefaults(): void {
    const defaultUserId = '27157bfd-443f-4eea-8431-bf58a74bae8b';
    
    // Seed real-world notes as verified in live database survey
    this.vaultNotes.set('ca03371d-1107-47c1-8704-93ad011becd1', {
      id: 'ca03371d-1107-47c1-8704-93ad011becd1',
      user_id: defaultUserId,
      title: 'Deen',
      path: 'Documents/Deen.pdf.md',
      folder: 'Documents',
      content: `---\npdf_url: "https://example.supabase.co/storage/v1/object/public/media/vault_pdfs/${defaultUserId}/Deen.pdf"\npdf_notes:\n  - id: 101\n    page: 1\n    startX: 100\n    startY: 150\n    w: 200\n    h: 24\n    color: "#fef08a"\nlast_opened_page: 1\n---\n# Deen Study Notes\nCore theological principles and reflections.`,
    });

    this.vaultNotes.set('5ded10e3-4de3-4f22-9bf8-c5a31e5efaaf', {
      id: '5ded10e3-4de3-4f22-9bf8-c5a31e5efaaf',
      user_id: defaultUserId,
      title: 'History',
      path: 'Documents/History.pdf.md',
      folder: 'Documents',
      content: `---\npdf_url: "https://example.supabase.co/storage/v1/object/public/media/vault_pdfs/${defaultUserId}/History.pdf"\npdf_notes: []\nlast_opened_page: 5\n---\n# History Chronology\nOttoman era and Middle Eastern political dynamics.`,
    });

    this.vaultNotes.set('4c7602a5-5157-43d1-abde-70e12a18b5c3', {
      id: '4c7602a5-5157-43d1-abde-70e12a18b5c3',
      user_id: defaultUserId,
      title: 'AI',
      path: 'Documents/AI.pdf.md',
      folder: 'Documents',
      content: `---\npdf_url: "https://example.supabase.co/storage/v1/object/public/media/vault_pdfs/${defaultUserId}/AI.pdf"\npdf_notes: '[{"id":1788160912257,"page":196,"startX":347.52,"startY":102.40,"w":88.00,"h":19.84,"color":"#fef08a","text":"Key gradient descent convergence bound"}]'\nlast_opened_page: 196\n---\n# AI Systems & Optimization\nDeep learning theory, loss landscapes, and diffusion models.`,
    });

    this.userMetadata = {
      mascotShape: 'galet',
      mascotColor: 'bleu',
      mascotExpression: 'timide',
      bgTheme: 'bg-[#080d2a]',
    };
  }

  from(table: string) {
    const self = this;
    if (table !== 'vault_notes') {
      throw new Error(`MockSupabase table not implemented: ${table}`);
    }

    return {
      select(fields = '*') {
        return {
          eq(field: string, val: any) {
            return {
              async single() {
                for (const row of self.vaultNotes.values()) {
                  if ((row as any)[field] === val) {
                    return { data: { ...row }, error: null };
                  }
                }
                return { data: null, error: { message: 'Not found' } };
              },
              async then(resolve: any) {
                const results: any[] = [];
                for (const row of self.vaultNotes.values()) {
                  if ((row as any)[field] === val) {
                    results.push({ ...row });
                  }
                }
                resolve({ data: results, error: null });
              }
            };
          }
        };
      },
      update(updates: Partial<VaultNoteRow>) {
        return {
          eq(field: string, val: any) {
            let updatedCount = 0;
            for (const [id, row] of self.vaultNotes.entries()) {
              if ((row as any)[field] === val) {
                self.vaultNotes.set(id, { ...row, ...updates, updated_at: new Date().toISOString() });
                updatedCount++;
              }
            }
            return Promise.resolve({ count: updatedCount, error: null });
          }
        };
      }
    };
  }

  get storage() {
    const self = this;
    return {
      from(bucket: string) {
        return {
          getPublicUrl(objectPath: string) {
            return {
              data: {
                publicUrl: `https://example.supabase.co/storage/v1/object/public/${bucket}/${objectPath}`
              }
            };
          },
          async upload(objectPath: string, fileData: any, options?: any) {
            self.mediaStorage.set(`${bucket}/${objectPath}`, {
              buffer: fileData,
              contentType: options?.contentType || 'application/octet-stream'
            });
            return { data: { path: `${bucket}/${objectPath}` }, error: null };
          }
        };
      }
    };
  }

  get auth() {
    const self = this;
    return {
      async getUser() {
        return {
          data: {
            user: {
              id: '27157bfd-443f-4eea-8431-bf58a74bae8b',
              user_metadata: { ...self.userMetadata }
            }
          },
          error: null
        };
      },
      async updateUser(params: { data: any }) {
        self.userMetadata = { ...self.userMetadata, ...params.data };
        return {
          data: {
            user: {
              id: '27157bfd-443f-4eea-8431-bf58a74bae8b',
              user_metadata: { ...self.userMetadata }
            }
          },
          error: null
        };
      }
    };
  }
}

// ============================================================================
// 3. MASCOT STATE MACHINE DRIVER
// ============================================================================

export interface MascotPersistentConfig {
  expression: ExpressionId;
  shape: string;
  color: string;
  gaze?: { yaw: number; pitch: number; roll: number };
}

export class MascotStateMachineSimulator {
  public persistentSettings: MascotPersistentConfig;
  public activeAnimation: { state: StateId; expr: ExpressionId };
  public idleTimer: any = null;
  public isSleeping = false;
  public backflipExecuted = false;
  public storage: MockLocalStorage;
  public userId: string;

  constructor(
    initial: MascotPersistentConfig = { expression: 'timide', shape: 'galet', color: 'bleu' },
    storage = new MockLocalStorage(),
    userId = 'user_123',
    skipInitialSync = false
  ) {
    this.persistentSettings = { ...initial };
    this.activeAnimation = { state: 'idle', expr: initial.expression };
    this.storage = storage;
    this.userId = userId;
    if (!skipInitialSync) {
      this.syncToStorage();
    }
  }

  private syncToStorage(): void {
    this.storage.setItem(`${this.userId}_mascotExpression`, this.persistentSettings.expression);
    this.storage.setItem(`${this.userId}_mascotShape`, this.persistentSettings.shape);
    this.storage.setItem(`${this.userId}_mascotColor`, this.persistentSettings.color);
    if (this.persistentSettings.gaze) {
      this.storage.setItem(`${this.userId}_mascotGaze`, JSON.stringify(this.persistentSettings.gaze));
    }
  }

  updatePersistentSettings(newSettings: Partial<MascotPersistentConfig>): void {
    this.persistentSettings = { ...this.persistentSettings, ...newSettings };
    this.syncToStorage();
  }

  triggerMascot(state: StateId, transientExpr: ExpressionId, persist = false): number {
    this.activeAnimation = { state, expr: transientExpr };
    if (state === 'orbit') {
      this.backflipExecuted = true;
    }

    if (persist) {
      this.updatePersistentSettings({ expression: transientExpr });
    }

    // Dynamic duration lookup
    const durationSec = STATE_DURATIONS[state] ?? 2.4;
    const durationMs = Math.round(durationSec * 1000);

    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.resetToIdle();
    }, durationMs);

    return durationMs;
  }

  resetToIdle(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    // Reads persistent settings rather than transient
    this.activeAnimation = {
      state: 'idle',
      expr: this.persistentSettings.expression
    };
  }

  simulateAfkSleep(): void {
    this.activeAnimation = { state: 'sleep', expr: 'somnolent' };
    this.isSleeping = true;
    // Transient sleep MUST NOT overwrite persistent expression!
  }

  simulateTabVisibilityChange(remoteMetadata?: Partial<MascotPersistentConfig>): void {
    if (remoteMetadata) {
      if (remoteMetadata.expression) this.persistentSettings.expression = remoteMetadata.expression;
      if (remoteMetadata.shape) this.persistentSettings.shape = remoteMetadata.shape;
      if (remoteMetadata.color) this.persistentSettings.color = remoteMetadata.color;
      if (remoteMetadata.gaze) this.persistentSettings.gaze = remoteMetadata.gaze;
      this.syncToStorage();
    } else {
      // Rehydrate from storage
      const expr = this.storage.getItem(`${this.userId}_mascotExpression`) as ExpressionId | null;
      const shape = this.storage.getItem(`${this.userId}_mascotShape`);
      const color = this.storage.getItem(`${this.userId}_mascotColor`);
      if (expr) this.persistentSettings.expression = expr;
      if (shape) this.persistentSettings.shape = shape;
      if (color) this.persistentSettings.color = color;
    }
  }
}

// ============================================================================
// 4. MARKDOWN AUTO-SAVE & BEACON SIMULATOR
// ============================================================================

export class MarkdownAutoSaveSimulator {
  public content: string;
  public savedContent: string;
  public isDirty = false;
  public isSaving = false;
  public debounceTimer: any = null;
  public saveCallCount = 0;
  public beaconEngine: MockBeaconEngine;
  public notePath: string;

  constructor(initialContent: string, notePath: string, beaconEngine = new MockBeaconEngine()) {
    this.content = initialContent;
    this.savedContent = initialContent;
    this.notePath = notePath;
    this.beaconEngine = beaconEngine;
  }

  typeContent(newContent: string, debounceMs = 1000): void {
    this.content = newContent;
    this.isDirty = this.content !== this.savedContent;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (this.isDirty) {
      this.debounceTimer = setTimeout(() => {
        this.flushSave();
      }, debounceMs);
    }
  }

  flushSave(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.isSaving = true;
    this.savedContent = this.content;
    this.isDirty = false;
    this.saveCallCount++;
    this.isSaving = false;
  }

  handleBeforeUnload(): boolean {
    if (this.isDirty) {
      return this.beaconEngine.sendBeacon('/api/obsidian/flush', {
        path: this.notePath,
        content: this.content,
        timestamp: Date.now()
      });
    }
    return false;
  }
}

// ============================================================================
// 5. THEME & CSS VARIABLE RUNTIME DRIVER
// ============================================================================

export class ThemeRuntimeDriver {
  public activeThemeId: string;
  public htmlAttributes: Record<string, string> = {};
  public metaThemeColor = '';

  constructor(initialThemeId = 'bg-[#080d2a]') {
    this.activeThemeId = initialThemeId;
    this.applyTheme(initialThemeId);
  }

  applyTheme(themeId: string): void {
    const token = getThemeToken(themeId);
    this.activeThemeId = token.id;
    this.htmlAttributes['data-theme'] = token.id;
    this.htmlAttributes['class'] = `${token.id} dark`;
    this.metaThemeColor = token.color;
  }

  getCssVariables(): Record<string, string> {
    const token = getThemeToken(this.activeThemeId);
    return { ...token.cssVariables };
  }

  getCssVariableValue(varName: string): string | undefined {
    const vars = this.getCssVariables() as Record<string, string>;
    return vars[varName];
  }
}

// ============================================================================
// 6. SOURCE CODE VERIFICATION HELPER
// ============================================================================

export function readAppSourceFile(relativePath: string): string {
  const fullPath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}
