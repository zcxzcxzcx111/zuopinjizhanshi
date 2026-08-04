# Map Character Preview and Memory Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make generated character stickers prominent and centered on the map, provide a centered large preview on tap, and navigate memory photos back to their exact map marker.

**Architecture:** Keep screen ownership in `App.tsx`: the timeline emits a photo ID and `App` switches to the map while passing that ID as a focus target. `MapScreen` resolves the target through a small tested utility, while `WebMapView` remains responsible only for Leaflet sizing and map movement. A dedicated presentational overlay displays the generated sticker without coupling preview state to Leaflet HTML.

**Tech Stack:** React 19, React Native Web, TypeScript, Leaflet, Vitest, Expo Web PWA.

## Global Constraints

- A user uploads only one portrait; fixed style references remain server-side and unchanged.
- Existing photo persistence and marker derivation formats must remain backward compatible.
- Map navigation must use the photo ID, because one day can contain multiple locations.
- Generated stickers must use `contain`, remain centered, and preserve transparent pixels.
- No new runtime dependency is required.

---

### Task 1: Photo-to-marker focus contract

**Files:**
- Create: `src/utils/mapNavigation.ts`
- Create: `src/utils/mapNavigation.test.ts`
- Modify: `App.tsx`
- Modify: `src/screens/TimelineScreen.tsx`
- Modify: `src/components/DailySummary.tsx`
- Modify: `src/screens/MapScreen.tsx`

**Interfaces:**
- Consumes: `SceneMarker[]` and a persisted `Photo.id`.
- Produces: `findMarkerIndexByPhotoId(markers, photoId): number`, and `onNavigateToMap(photoId?: string): void`.

- [ ] **Step 1: Write the failing focus utility tests**

```ts
expect(findMarkerIndexByPhotoId(markers, 'photo-b')).toBe(1);
expect(findMarkerIndexByPhotoId(markers, 'missing')).toBe(-1);
expect(findMarkerIndexByPhotoId(markers, undefined)).toBe(-1);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run src/utils/mapNavigation.test.ts`

Expected: FAIL because `mapNavigation.ts` does not exist.

- [ ] **Step 3: Implement the lookup and navigation wiring**

```ts
export function findMarkerIndexByPhotoId(markers: SceneMarker[], photoId?: string) {
  if (!photoId) return -1;
  return markers.findIndex((marker) => marker.photos.some((photo) => photo.id === photoId));
}
```

`DailySummary` passes `story.dailyPickPhoto.id` when its image or card is pressed. `TimelineScreen` forwards that ID. `App` stores it and switches to the map. `MapScreen` resolves it, selects that marker, and lets the existing Leaflet `flyTo` behavior center the location.

- [ ] **Step 4: Run utility tests and typecheck**

Run: `npx vitest run src/utils/mapNavigation.test.ts && npm run typecheck`

Expected: all focused tests pass and TypeScript exits 0.

### Task 2: Larger map stickers and centered preview

**Files:**
- Create: `src/components/CharacterPreview.tsx`
- Modify: `src/screens/MapScreen.tsx`
- Modify: `src/components/WebMapView.tsx`

**Interfaces:**
- Consumes: `imageUri: string`, `placeName?: string`, `onClose(): void`.
- Produces: a full-screen dimmed overlay with a centered `resizeMode="contain"` image.

- [ ] **Step 1: Add the centered preview component**

```tsx
<View style={styles.overlay}>
  <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
  <View style={styles.card}>
    <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
  </View>
</View>
```

- [ ] **Step 2: Open the preview from a generated marker**

When `handleMarkerPress(index)` finds `markers[index].photos[].characterUri`, set that URI as preview state while also selecting the marker. Closing the preview leaves the marker selected so its info sheet remains usable.

- [ ] **Step 3: Enlarge generated Leaflet markers**

Use 76 px for normal generated stickers and 96 px for selected generated stickers; retain existing fallback sizes. Compute `iconSize` and `iconAnchor` from the generated sticker footprint so the transparent image remains centered above its coordinate.

- [ ] **Step 4: Run typecheck and full tests**

Run: `npm run typecheck && npm test -- --run`

Expected: TypeScript exits 0 and all test files pass.

### Task 3: PWA verification and production release

**Files:**
- Verify: `dist/index.html`
- Deploy: Vercel project `memory-map`

**Interfaces:**
- Consumes: completed UI and navigation changes.
- Produces: updated production PWA at `https://memory-map-pink.vercel.app`.

- [ ] **Step 1: Build and verify the PWA**

Run: `npm run build:pwa`

Expected: Expo export completes and `PWA verification passed.` is printed.

- [ ] **Step 2: Deploy production**

Run: `npx vercel --prod --yes`

Expected: deployment reaches `READY` and aliases to `https://memory-map-pink.vercel.app`.

- [ ] **Step 3: Verify the production document**

Run: `Invoke-WebRequest https://memory-map-pink.vercel.app -UseBasicParsing`

Expected: HTTP 200 and the current Expo bundle is referenced.

## Self-Review

- Spec coverage: marker sizing, centered large preview, memory-photo-to-marker navigation, PWA deployment, and mobile behavior are each covered.
- Placeholder scan: no deferred implementation placeholders remain.
- Type consistency: every navigation layer uses the same optional `photoId?: string` contract; marker lookup returns the existing numeric index consumed by `WebMapView`.
