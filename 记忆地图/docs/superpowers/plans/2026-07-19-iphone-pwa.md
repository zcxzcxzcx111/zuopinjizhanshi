# iPhone PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish MemoryMap as an installable iPhone PWA that launches from the Home Screen, retains local memories, and provides a safe offline application shell.

**Architecture:** Keep Expo's static Web export, copy PWA assets from `public/`, and register a same-origin service worker from the existing entry point. Add iOS-specific metadata and an in-app Safari installation hint. Verify the generated `dist/` contract before deploying it with the existing Vercel configuration.

**Tech Stack:** Expo Web/React Native Web, Web App Manifest, Service Worker Cache API, Vercel static hosting and Functions.

## Global Constraints

- Target iPhone Safari and Home Screen standalone mode.
- Preserve Android, native, and desktop Web behavior.
- Never cache `/api/` responses or unbounded cross-origin map tiles in the service worker.
- Do not expose `AMAP_WEB_SERVICE_KEY` to browser JavaScript.
- Git commits cannot run because this directory is not a Git repository.

---

### Task 1: Install Metadata and iPhone UX

**Files:**
- Modify: `index.ts`
- Modify: `public/manifest.json`
- Create: `public/icons/apple-touch-icon.png`
- Create: `src/components/PwaInstallHint.tsx`
- Modify: `App.tsx`

**Interfaces:**
- `configurePwa()` adds manifest, theme, Apple Web App, viewport, and touch-icon metadata on Web and registers `/sw.js` only in production.
- `PwaInstallHint` renders only on iPhone Safari when the app is not running standalone and remembers dismissal in localStorage.

- [ ] **Step 1: Add Web metadata and service-worker registration**

Use `document.head` to ensure `manifest`, `apple-touch-icon`, `theme-color`, `description`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, and `apple-mobile-web-app-title` are present. On window load, call `navigator.serviceWorker.register('/sw.js', { scope: '/' })` when `__DEV__` is false.

- [ ] **Step 2: Complete the manifest**

Set `id`, `scope`, `lang`, `dir`, `display_override`, and include 192, 512, maskable 512, and Apple 180 icons.

- [ ] **Step 3: Generate the Apple icon**

Run: `node -e "require('sharp')('public/icons/icon-512.png').resize(180,180).png().toFile('public/icons/apple-touch-icon.png')"`

Expected: a 180×180 PNG exists.

- [ ] **Step 4: Add the Safari installation hint**

Detect `/iPhone|iPod/`, exclude standalone mode using `navigator.standalone` and `matchMedia('(display-mode: standalone)')`, and show `点击 Safari 分享按钮，然后选择“添加到主屏幕”` with a dismiss action stored under `memory-map:pwa-hint-dismissed`.

- [ ] **Step 5: Commit**

Run: `git add index.ts public/manifest.json public/icons/apple-touch-icon.png src/components/PwaInstallHint.tsx App.tsx && git commit -m "feat: add iPhone PWA installation experience"`

### Task 2: Safe Offline Application Shell

**Files:**
- Modify: `public/sw.js`

**Interfaces:**
- Service worker precaches only same-origin application-shell files.
- Navigation uses network-first with cached `/` fallback; static same-origin assets use stale-while-revalidate; API and cross-origin traffic bypass the cache.

- [ ] **Step 1: Bump the cache version and define the shell**

Use cache `memorymap-shell-v2` and precache `/`, `/manifest.json`, `/icons/icon-192.png`, `/icons/icon-512.png`, and `/icons/apple-touch-icon.png`.

- [ ] **Step 2: Implement bounded request routing**

Return immediately for non-GET, `/api/`, and cross-origin requests. Use network-first for navigation and stale-while-revalidate only for destination types `script`, `style`, `image`, and `font`.

- [ ] **Step 3: Verify activation cleanup**

Delete every cache whose name differs from `memorymap-shell-v2`, then call `clients.claim()`.

- [ ] **Step 4: Commit**

Run: `git add public/sw.js && git commit -m "feat: add bounded PWA offline cache"`

### Task 3: Build and Hosting Contract

**Files:**
- Create: `scripts/verify-pwa.mjs`
- Modify: `package.json`
- Modify: `vercel.json`

**Interfaces:**
- `npm run verify:pwa` fails unless `dist/manifest.json`, `dist/sw.js`, all required icons, and service-worker registration exist in the exported build.
- Vercel sends no-cache headers for the service worker and security headers for all routes.

- [ ] **Step 1: Add generated-build verification**

Read the generated manifest, assert `display === 'standalone'`, verify every icon path exists under `dist/`, and search generated JS for `serviceWorker.register` and `/sw.js`.

- [ ] **Step 2: Add scripts**

Set `build:pwa` to `expo export --platform web && node scripts/verify-pwa.mjs` and `verify:pwa` to `node scripts/verify-pwa.mjs`.

- [ ] **Step 3: Add hosting headers**

Set `/sw.js` to `Cache-Control: public, max-age=0, must-revalidate` and add `X-Content-Type-Options`, `Referrer-Policy`, and a self-only camera/geolocation `Permissions-Policy` globally.

- [ ] **Step 4: Run the full build gate**

Run: `npm run typecheck && npm test -- --run && npm run build:pwa`

Expected: typecheck passes, all tests pass, and the PWA verifier prints `PWA verification passed.`

- [ ] **Step 5: Commit**

Run: `git add scripts/verify-pwa.mjs package.json vercel.json && git commit -m "chore: verify and harden PWA hosting"`

### Task 4: Vercel Deployment

**Files:**
- Deploy existing project files; no generated `dist/` source commit.

**Interfaces:**
- Production URL serves the PWA and `/api/reverse-geocode`.

- [ ] **Step 1: Check Vercel authentication**

Run: `npx vercel whoami`

Expected: the authenticated account name. If unauthenticated, preserve the completed build and request the user to authenticate before deployment.

- [ ] **Step 2: Configure the private Amap key**

Run: `npx vercel env add AMAP_WEB_SERVICE_KEY production`

Expected: Vercel confirms a server-only production environment variable; the secret value is never written to source or command output.

- [ ] **Step 3: Deploy production**

Run: `npx vercel --prod --yes`

Expected: an HTTPS production URL.

- [ ] **Step 4: Verify production endpoints**

Request `/manifest.json`, `/sw.js`, `/icons/apple-touch-icon.png`, and `/api/reverse-geocode?lat=30.2741&lng=120.1551`. Confirm static endpoints return 200 and the API returns either 200 when configured or a controlled 503 when the key is absent.

