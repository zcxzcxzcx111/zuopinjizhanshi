import type { SceneMarker } from '../types';

export function findMarkerIndexByPhotoId(markers: SceneMarker[], photoId?: string): number {
  if (!photoId) return -1;
  return markers.findIndex((marker) => marker.photos.some((photo) => photo.id === photoId));
}
