/**
 * usePhotoAsset.ts
 *
 * React hook that lazily loads photo binary assets (uri, characterUri)
 * from the module-level cache / IndexedDB on demand.
 *
 * Usage:
 *   const { uri, characterUri, loading } = usePhotoAsset(photo.id);
 */

import { useState, useEffect } from 'react';
import { loadPhotoAssets, peekPhotoAssets } from '../services/photoAssetStorage';

export interface PhotoAssetState {
  uri: string | undefined;
  characterUri: string | undefined;
  loading: boolean;
}

export function usePhotoAsset(photoId: string | undefined): PhotoAssetState {
  // Try synchronous cache hit first to avoid a render cycle
  const initial = photoId ? peekPhotoAssets(photoId) : undefined;

  const [state, setState] = useState<PhotoAssetState>({
    uri: initial?.uri,
    characterUri: initial?.characterUri,
    loading: !initial && !!photoId,
  });

  useEffect(() => {
    if (!photoId) {
      setState({ uri: undefined, characterUri: undefined, loading: false });
      return;
    }

    // If already in cache, reflect it immediately
    const cached = peekPhotoAssets(photoId);
    if (cached) {
      setState({ uri: cached.uri, characterUri: cached.characterUri, loading: false });
      return;
    }

    let cancelled = false;
    setState(prev => ({ ...prev, loading: true }));

    loadPhotoAssets(photoId).then(assets => {
      if (!cancelled) {
        setState({
          uri: assets?.uri,
          characterUri: assets?.characterUri,
          loading: false,
        });
      }
    }).catch(() => {
      if (!cancelled) setState(prev => ({ ...prev, loading: false }));
    });

    return () => { cancelled = true; };
  }, [photoId]);

  return state;
}
