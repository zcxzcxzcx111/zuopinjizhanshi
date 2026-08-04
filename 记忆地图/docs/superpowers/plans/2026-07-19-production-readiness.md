# MemoryMap Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MemoryMap retain imported memories across restarts, produce correct daily stories, keep the Amap credential off the client, and add repeatable project validation.

**Architecture:** Add one platform-aware storage boundary: IndexedDB stores photo records (including data URLs) on Web, while AsyncStorage stores metadata and FileSystem owns copied image files on native. Keep derived markers and day stories pure and deterministic. Route reverse geocoding through a same-origin/explicit proxy whose secret exists only in the server environment.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.9, AsyncStorage, expo-file-system legacy API, IndexedDB, Vercel Functions, Vitest.

## Global Constraints

- Preserve Web, iOS, and Android behavior.
- Do not persist Web image data in localStorage.
- Never place `AMAP_WEB_SERVICE_KEY` or another private key in an `EXPO_PUBLIC_*` variable.
- Do not overwrite unrelated design, pet, or image-generation artifacts.
- Git is unavailable in the current environment, so commit steps are documented but cannot be executed here.

---

### Task 1: Deterministic Story Derivation

**Files:**
- Modify: `src/data/mockPhotos.ts`
- Create: `src/data/photoDerivations.test.ts`

**Interfaces:**
- Consumes: `Photo`, `SceneMarker`, and `DayStory` from `src/types/index.ts`.
- Produces: `generateSceneMarkers(photos: Photo[]): SceneMarker[]` and `generateDayStories(photos: Photo[]): DayStory[]` with stable grouping and exactly one daily pick.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { generateDayStories, generateSceneMarkers } from './mockPhotos';
import type { Photo } from '../types';

const photo = (id: string, date: string, latitude: number, scene: Photo['scene'], isDailyPick = false): Photo => ({
  id, uri: `file://${id}.jpg`, date, scene, isDailyPick,
  description: id,
  location: { latitude, longitude: 120, placeName: id },
});

describe('photo derivations', () => {
  it('recomputes a day summary from every photo and selects only one daily pick', () => {
    const stories = generateDayStories([
      photo('lake', '2026-07-19', 30, 'rowing', true),
      photo('meal', '2026-07-19', 31, 'dining', true),
    ]);
    expect(stories[0].summary).toContain('划船');
    expect(stories[0].summary).toContain('品尝美食');
    expect(stories[0].dailyPickPhoto?.id).toBe('lake');
  });

  it('uses the same location aggregation for map and timeline markers', () => {
    const photos = [photo('a', '2026-07-19', 30.0001, 'park'), photo('b', '2026-07-19', 30.0002, 'park')];
    expect(generateDayStories(photos)[0].markers).toEqual(generateSceneMarkers(photos));
  });
});
```

- [ ] **Step 2: Run the test and verify the current implementation fails**

Run: `npm test -- --run src/data/photoDerivations.test.ts`

Expected: the summary omits the second scene and timeline markers differ from map markers.

- [ ] **Step 3: Implement grouping before derivation**

```ts
export function generateDayStories(photos: Photo[]): DayStory[] {
  const byDate = new Map<string, Photo[]>();
  for (const photo of photos) {
    byDate.set(photo.date, [...(byDate.get(photo.date) ?? []), photo]);
  }
  return [...byDate.entries()]
    .map(([date, dayPhotos]) => ({
      date,
      summary: generateDaySummary(date, dayPhotos),
      markers: generateSceneMarkers(dayPhotos),
      dailyPickPhoto: dayPhotos.find((photo) => photo.isDailyPick) ?? dayPhotos[0],
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
```

- [ ] **Step 4: Run the focused test**

Run: `npm test -- --run src/data/photoDerivations.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/data/mockPhotos.ts src/data/photoDerivations.test.ts && git commit -m "fix: derive complete daily stories"`

### Task 2: Cross-Platform Photo Persistence

**Files:**
- Create: `src/services/photoStorage.ts`
- Modify: `src/hooks/usePhotoStore.ts`
- Modify: `src/services/photoService.ts`
- Modify: `App.tsx`
- Create: `src/services/photoStorage.test.ts`

**Interfaces:**
- Produces: `loadPhotos(): Promise<Photo[]>`, `savePhotos(photos: Photo[]): Promise<void>`, `persistPhotoAsset(uri: string, id: string): Promise<string>`, and `deletePersistedPhotoAsset(uri: string): Promise<void>`.
- Extends `PhotoStore` with `isHydrated: boolean` and `storageError: string | null`.

- [ ] **Step 1: Test the versioned storage envelope and malformed-data recovery**

```ts
import { describe, expect, it } from 'vitest';
import { decodePhotoEnvelope, encodePhotoEnvelope } from './photoStorage';

describe('photo storage envelope', () => {
  it('round trips version one records', () => {
    expect(decodePhotoEnvelope(encodePhotoEnvelope([]))).toEqual([]);
  });
  it('rejects malformed or unsupported records without crashing', () => {
    expect(decodePhotoEnvelope('{"version":99,"photos":[]}')).toEqual([]);
    expect(decodePhotoEnvelope('bad json')).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement the platform storage boundary**

Use `{ version: 1, photos }` envelopes. Use an IndexedDB `kv` object store and the key `photos` on Web. Use `AsyncStorage` with key `@memory-map/photos` on native. Copy native imports into `${FileSystem.documentDirectory}memory-map/photos/` before saving their URI.

- [ ] **Step 3: Persist assets during photo processing**

Generate the photo ID before returning the `Photo`, call `persistPhotoAsset(picked.uri, id)`, and assign the returned durable URI. Remove the unused `ImageManipulator` and `FileSystem` imports from `photoService.ts`.

- [ ] **Step 4: Hydrate once and save only after hydration**

Load records in the store's mount effect, expose `isHydrated`, and start its save effect only after load completes. Delete a native-owned file after removing its photo record. Keep storage failures visible through `storageError` without erasing in-memory data.

- [ ] **Step 5: Gate the application UI during hydration**

Render an `ActivityIndicator` until `store.isHydrated` is true and show a non-blocking storage warning when `store.storageError` is present.

- [ ] **Step 6: Run tests and type checking**

Run: `npm test -- --run src/services/photoStorage.test.ts && npm run typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 7: Commit**

Run: `git add App.tsx src/hooks/usePhotoStore.ts src/services/photoService.ts src/services/photoStorage.ts src/services/photoStorage.test.ts && git commit -m "feat: persist photo memories across restarts"`

### Task 3: Server-Side Reverse Geocoding

**Files:**
- Create: `api/reverse-geocode.js`
- Modify: `src/services/amapService.ts`
- Create: `.env.example`
- Modify: `vercel.json`

**Interfaces:**
- Browser client calls `/api/reverse-geocode?lat=...&lng=...`.
- Native client calls `${EXPO_PUBLIC_GEOCODE_PROXY_URL}?lat=...&lng=...`.
- Server reads private `AMAP_WEB_SERVICE_KEY` and returns the existing `AmapRegeocodeResult` shape.

- [ ] **Step 1: Remove the committed key and validate coordinates client-side**

Reject non-finite/out-of-range coordinates. Resolve the proxy URL by platform. If native has no `EXPO_PUBLIC_GEOCODE_PROXY_URL`, return `null` and log one actionable development warning.

- [ ] **Step 2: Implement the Vercel function**

Accept only GET, validate `lat` and `lng`, read `process.env.AMAP_WEB_SERVICE_KEY`, call Amap with `URLSearchParams`, normalize the result, and return `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`. Never return the upstream request URL or secret.

- [ ] **Step 3: Document environment variables**

```dotenv
AMAP_WEB_SERVICE_KEY=replace-with-a-server-side-amap-web-service-key
EXPO_PUBLIC_GEOCODE_PROXY_URL=https://your-domain.example/api/reverse-geocode
```

- [ ] **Step 4: Verify the source contains no credential**

Run: `rg -n "6497833e61ed45dec43ba26f3c03d167|AMAP_KEY" src api`

Expected: no matches.

- [ ] **Step 5: Commit**

Run: `git add api/reverse-geocode.js src/services/amapService.ts .env.example vercel.json && git commit -m "security: proxy reverse geocoding requests"`

### Task 4: Tooling and Expo Dependency Health

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces scripts: `typecheck`, `test`, `test:watch`, `doctor`, and `build:web`.

- [ ] **Step 1: Install compatible Expo dependencies**

Run: `npx expo install expo@~54.0.36 expo-file-system@~19.0.23 react-native-worklets`

Expected: dependencies resolve using Expo SDK 54-compatible versions.

- [ ] **Step 2: Install the test runner**

Run: `npm install --save-dev vitest`

- [ ] **Step 3: Add validation scripts**

```json
{
  "typecheck": "tsc --noEmit",
  "test": "vitest",
  "test:watch": "vitest",
  "doctor": "expo-doctor",
  "build:web": "expo export --platform web"
}
```

- [ ] **Step 4: Run the complete gate**

Run: `npm run typecheck && npm test -- --run && npm run doctor && npm run build:web`

Expected: typecheck and tests pass, Expo Doctor reports all checks passed, and Web export completes.

- [ ] **Step 5: Commit**

Run: `git add package.json package-lock.json && git commit -m "chore: add repeatable project validation"`

### Task 5: Final Security and Regression Review

**Files:**
- Review: `src/components/WebMapView.tsx`
- Review: all files changed by Tasks 1-4

**Interfaces:**
- No new API; this task validates the completed deliverable.

- [ ] **Step 1: Search for secrets and accidental debug logging**

Run: `rg -n "6497833e|AMAP_KEY|console\.log\(" src api`

Expected: no credential and no photo/GPS debug logging.

- [ ] **Step 2: Check repository status and generated output**

Run: `git status --short`

Expected: only intended source, test, configuration, plan, and lockfile changes; generated `dist/` remains ignored.

- [ ] **Step 3: Manually exercise critical flows**

On Web: add a GPS photo, refresh, verify it remains, change its scene, refresh, delete it, and refresh again. On a native development build: repeat the flow and verify the copied image still renders after restarting the app.

- [ ] **Step 4: Record limitations**

Document that scene selection is heuristic rather than pixel-level visual AI, and that native reverse geocoding requires `EXPO_PUBLIC_GEOCODE_PROXY_URL`.

