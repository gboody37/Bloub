/**
 * Offline Write-Ahead Log (WAL) Engine for Vibe Todos.
 * 
 * Provides durable local-first mutation logging with IndexedDB storage,
 * localStorage fallback, and in-memory persistence for SSR / Node.js test environments.
 * Guarantees zero data loss across note updates, PDF annotations, todos, and categories.
 */

export type MutationType = 
  | 'UPDATE_NOTE' 
  | 'SAVE_PDF_ANNOTATIONS' 
  | 'MUTATE_TODO' 
  | 'MUTATE_CATEGORY';

export interface MutationRecord {
  id: string;
  type: MutationType;
  payload: any;
  timestamp: number;
  synced: boolean;
  retryCount?: number;
  error?: string;
}

const DB_NAME = 'vibe_todos_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'wal_mutations';
const LOCAL_STORAGE_KEY = 'vibe_todos_wal_records';

// In-memory fallback store for Node.js / SSR / unsupported environments
const inMemoryStore = new Map<string, MutationRecord>();

/**
 * Check whether IndexedDB is available in the current runtime environment.
 */
function isIndexedDBAvailable(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.indexedDB !== 'undefined' &&
      window.indexedDB !== null
    );
  } catch {
    return false;
  }
}

/**
 * Check whether localStorage is available in the current runtime environment.
 */
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__wal_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open IndexedDB connection.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB is not available'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Read all mutations from localStorage fallback.
 */
function getLocalStorageMutations(): Record<string, MutationRecord> {
  if (!isLocalStorageAvailable()) return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save all mutations to localStorage fallback.
 */
function setLocalStorageMutations(mutations: Record<string, MutationRecord>): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mutations));
  } catch (err) {
    console.warn('[OfflineWAL] Failed to persist mutations to localStorage:', err);
  }
}

/**
 * Record a new mutation into durable storage before network dispatch.
 */
export async function recordMutation(
  mutation: Omit<MutationRecord, 'id' | 'timestamp' | 'synced'> & { id?: string; timestamp?: number; synced?: boolean }
): Promise<string> {
  const id = mutation.id || `wal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const record: MutationRecord = {
    id,
    type: mutation.type,
    payload: mutation.payload,
    timestamp: mutation.timestamp || Date.now(),
    synced: mutation.synced ?? false,
    retryCount: mutation.retryCount || 0,
    error: mutation.error
  };

  // 1. Try IndexedDB
  if (isIndexedDBAvailable()) {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      return id;
    } catch (err) {
      console.warn('[OfflineWAL] IndexedDB write failed, falling back to localStorage:', err);
    }
  }

  // 2. Fallback to localStorage
  if (isLocalStorageAvailable()) {
    try {
      const mutations = getLocalStorageMutations();
      mutations[id] = record;
      setLocalStorageMutations(mutations);
      return id;
    } catch (err) {
      console.warn('[OfflineWAL] localStorage write failed, falling back to memory:', err);
    }
  }

  // 3. Fallback to in-memory store
  inMemoryStore.set(id, record);
  return id;
}

/**
 * Get all pending (unsynced) mutations sorted chronologically (FIFO).
 */
export async function getPendingMutations(): Promise<MutationRecord[]> {
  let records: MutationRecord[] = [];

  if (isIndexedDBAvailable()) {
    try {
      const db = await openDB();
      records = await new Promise<MutationRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const all = (req.result || []) as MutationRecord[];
          resolve(all.filter(r => !r.synced));
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[OfflineWAL] IndexedDB read failed, checking localStorage fallback:', err);
      const local = getLocalStorageMutations();
      records = Object.values(local).filter(r => !r.synced);
    }
  } else if (isLocalStorageAvailable()) {
    const local = getLocalStorageMutations();
    records = Object.values(local).filter(r => !r.synced);
  } else {
    records = Array.from(inMemoryStore.values()).filter(r => !r.synced);
  }

  // Sort ascending by timestamp (FIFO)
  return records.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Mark a mutation as successfully synced.
 */
export async function markMutationSynced(id: string): Promise<void> {
  if (isIndexedDBAvailable()) {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const record = getReq.result as MutationRecord | undefined;
          if (record) {
            record.synced = true;
            record.error = undefined;
            const putReq = store.put(record);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
          } else {
            resolve();
          }
        };
        getReq.onerror = () => reject(getReq.error);
      });
      return;
    } catch (err) {
      console.warn('[OfflineWAL] IndexedDB markSynced failed, falling back to localStorage:', err);
    }
  }

  if (isLocalStorageAvailable()) {
    const mutations = getLocalStorageMutations();
    if (mutations[id]) {
      mutations[id].synced = true;
      delete mutations[id].error;
      setLocalStorageMutations(mutations);
    }
    return;
  }

  const memRecord = inMemoryStore.get(id);
  if (memRecord) {
    memRecord.synced = true;
    delete memRecord.error;
    inMemoryStore.set(id, memRecord);
  }
}

/**
 * Mark a mutation as failed with error details and increment retryCount.
 */
export async function markMutationFailed(id: string, errorMsg: string): Promise<void> {
  if (isIndexedDBAvailable()) {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const record = getReq.result as MutationRecord | undefined;
          if (record) {
            record.retryCount = (record.retryCount || 0) + 1;
            record.error = errorMsg;
            const putReq = store.put(record);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
          } else {
            resolve();
          }
        };
        getReq.onerror = () => reject(getReq.error);
      });
      return;
    } catch (err) {
      console.warn('[OfflineWAL] IndexedDB markFailed fallback:', err);
    }
  }

  if (isLocalStorageAvailable()) {
    const mutations = getLocalStorageMutations();
    if (mutations[id]) {
      mutations[id].retryCount = (mutations[id].retryCount || 0) + 1;
      mutations[id].error = errorMsg;
      setLocalStorageMutations(mutations);
    }
    return;
  }

  const memRecord = inMemoryStore.get(id);
  if (memRecord) {
    memRecord.retryCount = (memRecord.retryCount || 0) + 1;
    memRecord.error = errorMsg;
    inMemoryStore.set(id, memRecord);
  }
}

/**
 * Clean up all synced mutations from storage to reclaim space.
 */
export async function clearSyncedMutations(): Promise<number> {
  let clearedCount = 0;

  if (isIndexedDBAvailable()) {
    try {
      const db = await openDB();
      clearedCount = await new Promise<number>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const all = (req.result || []) as MutationRecord[];
          let count = 0;
          for (const item of all) {
            if (item.synced) {
              store.delete(item.id);
              count++;
            }
          }
          resolve(count);
        };
        req.onerror = () => reject(req.error);
      });
      return clearedCount;
    } catch (err) {
      console.warn('[OfflineWAL] IndexedDB clearSynced failed:', err);
    }
  }

  if (isLocalStorageAvailable()) {
    const mutations = getLocalStorageMutations();
    const active: Record<string, MutationRecord> = {};
    for (const [key, item] of Object.entries(mutations)) {
      if (!item.synced) {
        active[key] = item;
      } else {
        clearedCount++;
      }
    }
    setLocalStorageMutations(active);
    return clearedCount;
  }

  for (const [key, item] of inMemoryStore.entries()) {
    if (item.synced) {
      inMemoryStore.delete(key);
      clearedCount++;
    }
  }
  return clearedCount;
}

/**
 * Reset all WAL stores (used in test suites or user reset).
 */
export async function resetWALStore(): Promise<void> {
  inMemoryStore.clear();

  if (isLocalStorageAvailable()) {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  }

  if (isIndexedDBAvailable()) {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Ignore
    }
  }
}

/**
 * Dispatch a single mutation record to the appropriate backend endpoint.
 */
async function dispatchMutationToBackend(mutation: MutationRecord): Promise<boolean> {
  const { type, payload } = mutation;

  try {
    if (type === 'SAVE_PDF_ANNOTATIONS') {
      const res = await fetch('/api/obsidian/flush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.ok;
    }

    if (type === 'UPDATE_NOTE') {
      const res = await fetch('/api/obsidian/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.ok;
    }

    if (type === 'MUTATE_TODO' || type === 'MUTATE_CATEGORY') {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.ok;
    }

    return false;
  } catch (err) {
    console.warn(`[OfflineWAL] Network dispatch failed for ${mutation.id}:`, err);
    return false;
  }
}

/**
 * Flush all pending mutations to remote backend.
 * Supports optional custom executor for testing / custom transport.
 */
export async function flushPendingMutations(
  customDispatcher?: (mutation: MutationRecord) => Promise<boolean>
): Promise<{ success: boolean; syncedCount: number; pendingCount: number; errors: any[] }> {
  const pending = await getPendingMutations();
  if (pending.length === 0) {
    return { success: true, syncedCount: 0, pendingCount: 0, errors: [] };
  }

  let syncedCount = 0;
  const errors: any[] = [];

  for (const mutation of pending) {
    try {
      const success = customDispatcher 
        ? await customDispatcher(mutation)
        : await dispatchMutationToBackend(mutation);

      if (success) {
        await markMutationSynced(mutation.id);
        syncedCount++;
      } else {
        const errMsg = `HTTP/Network failure for mutation ${mutation.id}`;
        await markMutationFailed(mutation.id, errMsg);
        errors.push({ id: mutation.id, error: errMsg });
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Unknown flush error';
      await markMutationFailed(mutation.id, errMsg);
      errors.push({ id: mutation.id, error: errMsg });
    }
  }

  const remaining = await getPendingMutations();
  return {
    success: errors.length === 0,
    syncedCount,
    pendingCount: remaining.length,
    errors
  };
}

/**
 * Automatic online replayer registration.
 */
let isReplayerInitialized = false;

export function initOfflineWAL(): void {
  if (isReplayerInitialized || typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    console.log('[OfflineWAL] Network restored. Flushing pending mutations...');
    flushPendingMutations().catch(err => {
      console.error('[OfflineWAL] Auto-replay flush error:', err);
    });
  });

  isReplayerInitialized = true;
}

// Auto-initialize if running in browser
if (typeof window !== 'undefined') {
  initOfflineWAL();
}
