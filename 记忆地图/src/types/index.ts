export interface PhotoLocation {
  latitude: number;
  longitude: number;
  address?: string;
  placeName?: string;
}

export interface PersonProfile {
  id: string;
  name: string;
  faceDescriptor: number[]; // 128D array
  baseCharacterUri?: string; // Optional URL of the first generated AI character for consistency
}

/**
 * Heavy binary assets stored separately in `photo-assets` IndexedDB store.
 * NOT kept in React state. Loaded on demand via `usePhotoAsset(id)`.
 */
export interface PhotoAssets {
  id: string;
  uri?: string;           // original photo (data URL or blob URL)
  characterUri?: string;  // generated sticker (data URL)
  generationUri?: string; // temporary crop used during sticker generation
}

export interface Photo {
  id: string;
  /** NOTE: uri is NOT persisted in the `photos` DB store – it lives in `photo-assets`.
   *  It is available transiently in React state immediately after addPhoto/updatePhoto,
   *  and can be loaded on demand via usePhotoAsset(id). */
  uri?: string;
  location: PhotoLocation;
  date: string; // ISO date string
  tag?: string; // 可选的分类标签
  description: string;
  isDailyPick?: boolean;
  detectionReason?: string;
  /** NOTE: characterUri is NOT persisted in `photos` store – lives in `photo-assets`. */
  characterUri?: string;
  characterModel?: string;
  characterGenerationError?: string;

  // Background generation state
  isGeneratingSticker?: boolean;
  /** Temporary cropped image used as generation source. NOT persisted to DB. */
  generationUri?: string;
  peopleCount?: number;
  subjectType?: 'person' | 'object';
  personProfiles?: Array<PersonProfile | null>;

  // Persisted flags so the UI knows whether assets exist (for layout sizing)
  // without loading the actual binary data.
  hasUri?: boolean;
  hasCharacterUri?: boolean;

  /** Face detection data used for in-session naming UI. NOT persisted to DB. */
  rawFaces?: any[];
}

export interface SceneMarker {
  id: string;
  location: PhotoLocation;
  tag?: string;

  date: string;
  description: string;
  photos: Photo[];
}

export interface DayStory {
  date: string;
  summary: string;
  markers: SceneMarker[];
  dailyPickPhoto?: Photo;
}
