import { useState, useCallback, useEffect, useMemo } from 'react';
import { Photo, SceneMarker, DayStory } from '../types';
import { generateSceneMarkers, generateDayStories } from '../data/mockPhotos';
import {
  deletePersistedPhotoAsset,
  loadPhotos,
  savePhotoToDb,
  removePhotoFromDb,
  clearAllPhotosFromDb
} from '../services/photoStorage';
import {
  savePhotoAssets,
  deletePhotoAssets,
  clearAllPhotoAssets,
} from '../services/photoAssetStorage';

export interface PhotoStore {
  photos: Photo[];
  markers: SceneMarker[];
  dayStories: DayStory[];
  isHydrated: boolean;
  storageError: string | null;
  addPhoto: (photo: Photo) => void;
  addPhotos: (photos: Photo[]) => void;
  removePhoto: (id: string) => void;
  updatePhoto: (id: string, updates: Partial<Photo>) => void;
  clearAll: () => void;
}

/** Heavy fields that must be routed to photo-assets store, not React state. */
const HEAVY_KEYS = ['uri', 'characterUri', 'generationUri'] as const;
type HeavyKey = typeof HEAVY_KEYS[number];

/** Split a Photo into lightweight metadata + heavy assets. */
function splitPhoto(photo: Photo): {
  meta: Photo;
  assets: { id: string } & Partial<Pick<Photo, HeavyKey>>;
} {
  const meta: Photo = { ...photo };
  const assets: { id: string } & Partial<Pick<Photo, HeavyKey>> = { id: photo.id };

  for (const key of HEAVY_KEYS) {
    const val = (photo as any)[key];
    if (val) {
      (assets as any)[key] = val;
      // Set the flag on meta so UI knows the asset exists
      if (key === 'uri') meta.hasUri = true;
      if (key === 'characterUri') meta.hasCharacterUri = true;
    }
    // Keep transient copies in meta so components can use them immediately
    // after addPhoto without waiting for a DB round-trip.
    // They will be stripped by savePhotoToDb before writing to the DB.
  }

  return { meta, assets };
}

export function usePhotoStore(initialPhotos: Photo[] = []): PhotoStore {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadPhotos()
      .then((storedPhotos) => {
        if (cancelled) return;
        // Fix stuck generating state: any in-progress generation was interrupted by the refresh
        const cleaned = storedPhotos.map(p =>
          p.isGeneratingSticker
            ? { ...p, isGeneratingSticker: false, generationUri: undefined, characterGenerationError: 'generation_interrupted' }
            : p
        );
        setPhotos(cleaned.length > 0 ? cleaned : initialPhotos);
        setStorageError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStorageError(error instanceof Error ? error.message : '读取本地回忆失败。');
      })
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });

    return () => { cancelled = true; };
  }, []);

  const markers = useMemo(() => generateSceneMarkers(photos), [photos]);
  const dayStories = useMemo(() => generateDayStories(photos), [photos]);

  const addPhoto = useCallback((photo: Photo) => {
    const { meta, assets } = splitPhoto(photo);
    // Keep transient uri/characterUri in state for immediate rendering
    setPhotos((prev) => [...prev, photo]);
    // Persist assets to photo-assets store
    if (Object.keys(assets).length > 1) {
      savePhotoAssets(photo.id, assets).catch(e => setStorageError(e.message || '保存资产失败'));
    }
    // Persist meta (without heavy fields) to photos store
    savePhotoToDb(meta).catch(e => setStorageError(e.message || '保存照片失败'));
  }, []);

  const addPhotos = useCallback((newPhotos: Photo[]) => {
    setPhotos((prev) => [...prev, ...newPhotos]);
    for (const photo of newPhotos) {
      const { meta, assets } = splitPhoto(photo);
      if (Object.keys(assets).length > 1) {
        savePhotoAssets(photo.id, assets).catch(e => setStorageError(e.message || '保存资产失败'));
      }
      savePhotoToDb(meta).catch(e => setStorageError(e.message || '保存照片失败'));
    }
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const removed = prev.find((photo) => photo.id === id);
      if (removed) {
        deletePersistedPhotoAsset(removed.uri || '').catch((error: unknown) => {
          setStorageError(error instanceof Error ? error.message : '删除本地照片文件失败。');
        });
        deletePhotoAssets(id).catch(e => setStorageError(e.message || '删除资产失败'));
        removePhotoFromDb(id).catch(e => setStorageError(e.message || '删除照片记录失败'));
      }
      return prev.filter((photo) => photo.id !== id);
    });
  }, []);

  const updatePhoto = useCallback((id: string, updates: Partial<Photo>) => {
    setPhotos((prev) => {
      const newPhotos = prev.map((p) => {
        if (p.id !== id) return p;

        const updated: Photo = { ...p, ...updates };

        // Persist heavy asset updates to photo-assets store
        const assetUpdate: Partial<Pick<Photo, HeavyKey>> = {};
        let hasAssetUpdate = false;
        for (const key of HEAVY_KEYS) {
          if (key in updates && (updates as any)[key]) {
            (assetUpdate as any)[key] = (updates as any)[key];
            hasAssetUpdate = true;
            // Update flags on the meta record
            if (key === 'uri') updated.hasUri = true;
            if (key === 'characterUri') updated.hasCharacterUri = true;
          }
        }
        if (hasAssetUpdate) {
          savePhotoAssets(id, assetUpdate).catch(e => setStorageError(e.message || '更新资产失败'));
        }

        // Persist updated meta to photos store
        savePhotoToDb(updated).catch(e => setStorageError(e.message || '更新照片记录失败'));
        return updated;
      });
      return newPhotos;
    });
  }, []);

  const clearAll = useCallback(() => {
    setPhotos((prev) => {
      Promise.all(prev.map((photo) => deletePersistedPhotoAsset(photo.uri || ''))).catch((error: unknown) => {
        setStorageError(error instanceof Error ? error.message : '清理本地照片文件失败。');
      });
      clearAllPhotoAssets().catch(e => setStorageError(e.message || '清空资产数据库失败'));
      clearAllPhotosFromDb().catch(e => setStorageError(e.message || '清空数据库失败'));
      return [];
    });
  }, []);

  return {
    photos,
    markers,
    dayStories,
    isHydrated,
    storageError,
    addPhoto,
    addPhotos,
    removePhoto,
    updatePhoto,
    clearAll,
  };
}
