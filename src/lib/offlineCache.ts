/**
 * Offline data cache backed by IndexedDB.
 * Pre-loads the data the sell screen needs (products/stock, customers, settings)
 * so the POS keeps working with no internet connection.
 */

const DB_NAME = 'hani_pos_offline';
const DB_VERSION = 1;
const STORE = 'cache';

export type CacheKey = 'products' | 'customers' | 'settings';

interface CacheEnvelope<T> {
  key: string;
  userId: string;
  updatedAt: string;
  data: T;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: 'key' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.error('IndexedDB open failed', req.error);
          resolve(null);
        };
      } catch (e) {
        console.error('IndexedDB unavailable', e);
        resolve(null);
      }
    });
  }
  return dbPromise;
}

const entryKey = (key: CacheKey, userId: string) => `${key}:${userId}`;

export async function saveCache<T>(key: CacheKey, userId: string, data: T): Promise<void> {
  const db = await openDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const envelope: CacheEnvelope<T> = {
        key: entryKey(key, userId),
        userId,
        updatedAt: new Date().toISOString(),
        data,
      };
      tx.objectStore(STORE).put(envelope);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadCache<T>(
  key: CacheKey,
  userId: string,
): Promise<{ data: T; updatedAt: string } | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(entryKey(key, userId));
      req.onsuccess = () => {
        const value = req.result as CacheEnvelope<T> | undefined;
        resolve(value ? { data: value.data, updatedAt: value.updatedAt } : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function clearCache(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Local stock adjustments for sales made while offline                        */
/* -------------------------------------------------------------------------- */

export const OFFLINE_STOCK_EVENT = 'pos:offline-stock-delta';

export interface OfflineStockDelta {
  productId: string;
  quantity: number;
}

/** Notifies the product store that offline sales consumed stock locally. */
export function emitOfflineStockDeltas(deltas: OfflineStockDelta[]) {
  if (typeof window === 'undefined' || deltas.length === 0) return;
  window.dispatchEvent(new CustomEvent<OfflineStockDelta[]>(OFFLINE_STOCK_EVENT, { detail: deltas }));
}
