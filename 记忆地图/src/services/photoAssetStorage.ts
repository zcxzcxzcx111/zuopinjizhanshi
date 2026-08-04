/**
 * photoAssetStorage.ts
 *
 * Manages heavy binary fields (uri, characterUri, generationUri) in a separate
 * `photo-assets` IndexedDB object store so that the main `photos` store –
 * and therefore React state – only contains lightweight metadata.
 *
 * A module-level Map acts as an in-process cache so that repeated reads for
 * the same photo ID are instant after the first DB fetch.
 */

import type { PhotoAssets } from '../types';

export const DB_NAME = 'memory-map';
export const STORE_NAME = 'photo-assets';
export const DB_VERSION = 3; // must match photoStorage.ts

// Module-level LRU cache: id -> PhotoAssets
const MAX_CACHE_SIZE = 1000;
const cache = new Map<string, PhotoAssets>();

function setCache(id: string, assets: PhotoAssets) {
  cache.delete(id);
  cache.set(id, assets);
  if (cache.size > MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('key-value')) {
        db.createObjectStore('key-value');
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Cannot open DB'));
  });
}

/** Save (or merge) asset fields for a given photo id. Immediately updates cache. */
export async function savePhotoAssets(id: string, partial: Partial<Omit<PhotoAssets, 'id'>>): Promise<void> {
  // Merge into cache first for instant reads
  const existing = cache.get(id) ?? { id };
  const merged: PhotoAssets = { ...existing, ...partial, id };
  // Remove undefined keys so they don't overwrite existing values in DB
  (Object.keys(merged) as (keyof PhotoAssets)[]).forEach((k) => {
    if (merged[k] === undefined) delete merged[k];
  });
  setCache(id, merged);

  const db = await openDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(merged);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } finally {
      db.close();
    }
  });
}

/** Load assets for a single photo, hitting cache first. */
export async function loadPhotoAssets(id: string): Promise<PhotoAssets | undefined> {
  if (cache.has(id)) return cache.get(id);

  const db = await openDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => {
        const result: PhotoAssets | undefined = req.result;
        if (result) setCache(id, result);
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    } finally {
      db.close();
    }
  });
}

/** Delete assets for a photo (called when photo is removed). */
export async function deletePhotoAssets(id: string): Promise<void> {
  cache.delete(id);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } finally {
      db.close();
    }
  });
}

/** Delete all assets (called on clearAll). */
export async function clearAllPhotoAssets(): Promise<void> {
  cache.clear();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } finally {
      db.close();
    }
  });
}



/** Synchronous cache peek (returns undefined if not yet loaded). */
export function peekPhotoAssets(id: string): PhotoAssets | undefined {
  return cache.get(id);
}
