import type { Photo } from '../types';
import { decodePhotoEnvelope } from './photoStorageCodec';
import {
  savePhotoAssets,
  deletePhotoAssets,
  clearAllPhotoAssets,
} from './photoAssetStorage';

const STORAGE_KEY_OLD = '@memory-map/photos';
const WEB_DATABASE = 'memory-map';
const PHOTOS_STORE = 'photos';
const DB_VERSION = 3;

/** Heavy fields that live in photo-assets store, NOT in photos store. */
const ASSET_FIELDS = ['uri', 'characterUri', 'generationUri', 'rawFaces'] as const;

/** Strip heavy fields from a Photo before writing to the photos store. */
function toMetaRecord(photo: Photo): Omit<Photo, 'uri' | 'characterUri' | 'generationUri' | 'rawFaces'> & { hasUri?: boolean; hasCharacterUri?: boolean } {
  const meta: any = { ...photo };
  for (const f of ASSET_FIELDS) delete meta[f];
  // Persist flags so UI knows if assets exist
  if (photo.uri) meta.hasUri = true;
  if (photo.characterUri) meta.hasCharacterUri = true;
  return meta;
}

function openWebDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器不支持 IndexedDB，无法保存照片。'));
      return;
    }

    const request = indexedDB.open(WEB_DATABASE, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
        db.createObjectStore(PHOTOS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('key-value')) {
        db.createObjectStore('key-value');
      }
      if (!db.objectStoreNames.contains('photo-assets')) {
        db.createObjectStore('photo-assets', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开照片数据库。'));
  });
}

/** Migrate data from old single-key JSON storage. */
async function migrateOldDataIfNeeded(database: IDBDatabase): Promise<void> {
  try {
    const transaction = database.transaction(['key-value', PHOTOS_STORE], 'readwrite');
    const oldStore = transaction.objectStore('key-value');
    const request = oldStore.get(STORAGE_KEY_OLD);
    const oldData = await new Promise<any>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (typeof oldData === 'string') {
      const photos = decodePhotoEnvelope(oldData);
      const newStore = transaction.objectStore(PHOTOS_STORE);
      for (const photo of photos) {
        newStore.put(toMetaRecord(photo));
        // Move heavy fields to photo-assets
        const assets: any = { id: photo.id };
        if ((photo as any).uri) assets.uri = (photo as any).uri;
        if ((photo as any).characterUri) assets.characterUri = (photo as any).characterUri;
        if (Object.keys(assets).length > 1) {
          savePhotoAssets(photo.id, assets).catch(() => {});
        }
      }
      oldStore.delete(STORAGE_KEY_OLD);
    }
  } catch (e) {
    console.warn('Migration failed or no old data found:', e);
  }
}

/** Migrate existing photos store records that still contain heavy fields (DB v1→v3 upgrade). */
async function migrateHeavyFieldsIfNeeded(database: IDBDatabase): Promise<void> {
  try {
    const tx = database.transaction(PHOTOS_STORE, 'readwrite');
    const store = tx.objectStore(PHOTOS_STORE);
    const req = store.getAll();
    await new Promise<void>((resolve, reject) => {
      req.onsuccess = async () => {
        const records: any[] = req.result || [];
        const needsMigration = records.filter(r => r.uri || r.characterUri || r.generationUri || r.rawFaces);
        for (const record of needsMigration) {
          const assets: any = { id: record.id };
          if (record.uri) assets.uri = record.uri;
          if (record.characterUri) assets.characterUri = record.characterUri;
          if (record.generationUri) assets.generationUri = record.generationUri;
          // Move to photo-assets
          savePhotoAssets(record.id, assets).catch(() => {});
          // Remove heavy fields and update flags
          store.put(toMetaRecord(record));
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Heavy field migration failed:', e);
  }
}

export async function loadPhotos(): Promise<Photo[]> {
  const database = await openWebDatabase();
  await migrateOldDataIfNeeded(database);
  await migrateHeavyFieldsIfNeeded(database);

  // Warmed up asset cache has been removed to prevent memory exhaustion

  return new Promise((resolve, reject) => {
    try {
      const transaction = database.transaction(PHOTOS_STORE, 'readonly');
      const store = transaction.objectStore(PHOTOS_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error ?? new Error('读取照片列表失败。'));
    } catch (e) {
      reject(e);
    } finally {
      database.close();
    }
  });
}

export async function savePhotoToDb(photo: Photo): Promise<void> {
  // Save heavy fields to photo-assets store
  const assets: any = { id: photo.id };
  if (photo.uri) assets.uri = photo.uri;
  if (photo.characterUri) assets.characterUri = photo.characterUri;
  if (photo.generationUri) assets.generationUri = photo.generationUri;
  if (Object.keys(assets).length > 1) {
    savePhotoAssets(photo.id, assets).catch(() => {});
  }

  const meta = toMetaRecord(photo);
  const database = await openWebDatabase();
  return new Promise((resolve, reject) => {
    try {
      const transaction = database.transaction(PHOTOS_STORE, 'readwrite');
      const store = transaction.objectStore(PHOTOS_STORE);
      store.put(meta);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('保存照片失败。'));
      transaction.onabort = () => reject(transaction.error ?? new Error('保存照片已中止。'));
    } catch (e) {
      reject(e);
    } finally {
      database.close();
    }
  });
}

export async function removePhotoFromDb(id: string): Promise<void> {
  const database = await openWebDatabase();
  return new Promise((resolve, reject) => {
    try {
      const transaction = database.transaction(PHOTOS_STORE, 'readwrite');
      const store = transaction.objectStore(PHOTOS_STORE);
      store.delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('删除照片失败。'));
      transaction.onabort = () => reject(transaction.error ?? new Error('删除照片已中止。'));
    } catch (e) {
      reject(e);
    } finally {
      database.close();
    }
  });
}

export async function clearAllPhotosFromDb(): Promise<void> {
  const database = await openWebDatabase();
  return new Promise((resolve, reject) => {
    try {
      const transaction = database.transaction(PHOTOS_STORE, 'readwrite');
      const store = transaction.objectStore(PHOTOS_STORE);
      store.clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('清理数据库失败。'));
      transaction.onabort = () => reject(transaction.error ?? new Error('清理数据库已中止。'));
    } catch (e) {
      reject(e);
    } finally {
      database.close();
    }
  });
}

export async function persistPhotoAsset(uri: string, _id: string): Promise<string> {
  return uri;
}

export async function deletePersistedPhotoAsset(_uri: string): Promise<void> {
  // Photo data URLs are owned by the IndexedDB record and disappear with it.
}
