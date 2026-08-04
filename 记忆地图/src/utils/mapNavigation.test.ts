import { describe, expect, it } from 'vitest';
import type { SceneMarker } from '../types';
import { findMarkerIndexByPhotoId } from './mapNavigation';

const markers: SceneMarker[] = [
  {
    id: 'marker-a',
    location: { latitude: 30, longitude: 120 },
    tag: 'park',
    date: '2026-07-19',
    description: '公园',
    photos: [{
      id: 'photo-a', uri: 'a.jpg', location: { latitude: 30, longitude: 120 },
      tag: 'park', date: '2026-07-19', description: '公园',
    }],
  },
  {
    id: 'marker-b',
    location: { latitude: 31, longitude: 121 },
    tag: 'city',
    date: '2026-07-19',
    description: '城市',
    photos: [{
      id: 'photo-b', uri: 'b.jpg', location: { latitude: 31, longitude: 121 },
      tag: 'city', date: '2026-07-19', description: '城市',
    }],
  },
];

describe('map navigation', () => {
  it('finds the marker containing a memory photo', () => {
    expect(findMarkerIndexByPhotoId(markers, 'photo-b')).toBe(1);
  });

  it('does not choose an unrelated marker', () => {
    expect(findMarkerIndexByPhotoId(markers, 'missing')).toBe(-1);
    expect(findMarkerIndexByPhotoId(markers, undefined)).toBe(-1);
  });
});
