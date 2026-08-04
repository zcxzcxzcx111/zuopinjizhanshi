# PWA-Only Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Expo Go and native-app-only code while retaining the existing iPhone PWA, web development, tests, and Vercel deployment.

**Architecture:** Keep Expo SDK and React Native Web as the current web compiler/UI runtime. Collapse storage, photo selection, geolocation, maps, and character rendering to browser-only implementations, then remove native-only packages and configuration.

**Tech Stack:** Expo Web, React 19, React Native Web, TypeScript, IndexedDB, browser File/Geolocation APIs, Vercel, Vitest.

## Global Constraints

- The production target is an iPhone-installable PWA, not Expo Go or a native iOS/Android binary.
- Keep `expo`, `react-native`, and `react-native-web` because the current PWA build requires them.
- Preserve `npm run build:pwa`, service-worker behavior, IndexedDB persistence, photo upload/camera capture, and Vercel API routing.

---

### Task 1: Remove Native Runtime Branches

**Files:**
- Modify: `src/services/photoStorage.ts`
- Modify: `src/services/photoService.ts`
- Modify: `src/components/WebMapView.tsx`
- Modify: `src/components/QCharacter.tsx`
- Modify: `src/services/foodArtService.ts`
- Delete: `src/screens/NativeMapScreen.tsx`

**Interfaces:**
- Consumes: Existing browser IndexedDB, File API, Geolocation API, and Leaflet rendering.
- Produces: The same exported photo/storage services and React components with browser-only implementations.

- [x] **Step 1: Replace cross-platform storage with IndexedDB-only storage**

Remove AsyncStorage, FileSystem, and `Platform` imports. Make `loadPhotos` and `savePhotos` always use IndexedDB; make asset persistence return the data URL and deletion a resolved no-op because IndexedDB owns the record.

- [x] **Step 2: Replace native photo and location branches with browser APIs**

Remove `expo-image-picker`, `expo-location`, and `Platform`; call the existing browser file input, camera capture, and `navigator.geolocation` implementations directly.

- [x] **Step 3: Remove native maps and WebView rendering**

Render `DirectLeafletMap` unconditionally, remove `NativeWebViewMap` and its generated HTML, and delete `NativeMapScreen.tsx`.

- [x] **Step 4: Remove remaining native-only image helpers**

Use PNG or emoji rendering in `QCharacter`, and make food processing use the supplied browser image URI without Expo ImageManipulator.

### Task 2: Remove Expo Go Configuration and Dependencies

**Files:**
- Modify: `app.json`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: Expo Web CLI and the PWA export pipeline.
- Produces: A web-only command/dependency surface with no Expo Go launch commands.

- [x] **Step 1: Reduce Expo configuration to web metadata**

Remove iOS, Android, splash, native icon, new architecture, and native permission-plugin fields; retain the `expo.web` configuration.

- [x] **Step 2: Remove Expo Go scripts and native-only packages**

Remove `start`, `android`, `ios`, and `doctor`; keep `dev`, `web`, typecheck, tests, and PWA build scripts. Uninstall direct dependencies used only by native branches.

- [x] **Step 3: Refresh the lockfile**

Run `npm install` so `package-lock.json` matches the PWA-only dependency list.

### Task 3: Verify and Publish

**Files:**
- Test: `src/services/photoStorage.test.ts`
- Test: `src/data/photoDerivations.test.ts`
- Test: `api/reverse-geocode.test.mjs`

**Interfaces:**
- Consumes: The cleaned project.
- Produces: A verified production PWA deployment.

- [x] **Step 1: Run static and automated checks**

Run `npm run typecheck` and `npm test -- --run`; expect all checks to pass.

- [x] **Step 2: Build and validate the PWA**

Run `npm run build:pwa`; expect Expo Web export and `PWA verification passed.`

- [x] **Step 3: Deploy and smoke-test production**

Run `npx vercel --prod --yes`, then load the production alias and confirm the map landing page renders without console errors.
