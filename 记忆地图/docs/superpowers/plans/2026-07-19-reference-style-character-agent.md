# Reference-Style Character Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a transparent-background chibi anime character from each uploaded portrait, consistently guided by the three supplied MemoryMap style references.

**Architecture:** A Vercel serverless endpoint validates a resized portrait, combines it with three private bundled style references, and calls the OpenAI Image Edits API. The PWA invokes the endpoint after the user confirms scene and location, stores the returned transparent WebP data URL in IndexedDB, and prefers it over static scene artwork while retaining a non-blocking fallback.

**Tech Stack:** Expo Web, React Native Web, TypeScript, Vercel Functions, OpenAI Image Edits API, GPT Image 1.5, Canvas, IndexedDB, Vitest.

## Global Constraints

- The first input image is the identity source; the three bundled images are style-only references.
- Preserve recognizable facial traits, hair, glasses, and clothing cues without copying reference-image identities.
- Produce one centered full-body chibi sticker with a white outline and transparent pixels outside the outline.
- Do not output text, logos, watermarks, frames, scenery, or a solid background.
- Generation failure must not prevent the original photo from being saved.
- Keep `OPENAI_API_KEY` server-side and never expose it in the browser bundle.

---

### Task 1: Server-Side Character Generator

**Files:**
- Create: `api/generate-character.js`
- Create: `api/generate-character.test.mjs`
- Create: `api/style-references/style-sheet.jpg`
- Create: `api/style-references/rowing.png`
- Create: `api/style-references/beach.png`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `POST { imageDataUrl: string, scene: SceneType }` and `OPENAI_API_KEY`.
- Produces: `200 { imageDataUrl: string, model: string }` or a stable JSON error response.

- [x] **Step 1: Add request validation tests**

Test POST-only behavior, missing key handling, invalid data URLs, unsupported scenes, and upstream error mapping with a mocked `fetch`.

- [x] **Step 2: Build the reference-guided multipart request**

Send `image[]` fields in identity-first order, use `gpt-image-1.5`, `input_fidelity=high`, `size=1024x1024`, `quality=medium`, `background=transparent`, `output_format=webp`, and `output_compression=82`.

- [x] **Step 3: Bundle style references in the Vercel function**

Copy the supplied files under safe names and configure `includeFiles` plus a generation-compatible function duration.

### Task 2: PWA Generation Client and Data Model

**Files:**
- Create: `src/services/characterGeneration.ts`
- Create: `src/services/characterGeneration.test.ts`
- Modify: `src/types/index.ts`
- Modify: `src/services/photoService.ts`

**Interfaces:**
- Produces: `generateCharacterSticker(imageUri, scene): Promise<GeneratedCharacter>`.
- Adds: `Photo.characterUri?: string`, `Photo.characterModel?: string`, and `Photo.characterGenerationError?: string`.

- [x] **Step 1: Test image-response parsing and failure messages**

Verify valid WebP data URLs are accepted and malformed responses are rejected.

- [x] **Step 2: Resize portraits before upload**

Use browser Canvas to constrain the longest side to 1024 pixels and encode JPEG at 82% quality so requests remain below serverless body limits.

- [x] **Step 3: Generate after scene confirmation with graceful fallback**

Attach the returned character fields to `Photo`; on failure, retain the original photo and store a user-readable failure message.

### Task 3: Generated Character UI

**Files:**
- Modify: `src/components/PhotoUploader.tsx`
- Modify: `src/components/WebMapView.tsx`
- Modify: `src/components/QCharacter.tsx`
- Modify: `src/screens/PhotoDetail.tsx`

**Interfaces:**
- Consumes: The optional generated-character fields on `Photo`.
- Produces: Generated sticker rendering in map markers and photo details with static-art fallback.

- [x] **Step 1: Show real generation progress**

Display `正在生成专属动漫人物…` during the server request and explain that it can take up to two minutes.

- [x] **Step 2: Prefer generated character artwork**

Use `characterUri` in Leaflet marker HTML and `QCharacter`; retain scene PNG/emoji when no generated image exists.

- [x] **Step 3: Surface non-blocking failures**

After saving, notify the user when default artwork was used because generation was unavailable.

### Task 4: Verification and Deployment

**Files:**
- Modify: `scripts/verify-pwa.mjs`

**Interfaces:**
- Consumes: Completed backend and frontend generation flow.
- Produces: Tested build and deployable Vercel configuration.

- [x] **Step 1: Run unit and static checks**

Run `npm run typecheck` and `npm test -- --run`; expect all tests to pass.

- [x] **Step 2: Build the PWA**

Run `npm run build:pwa`; expect `PWA verification passed.`

- [ ] **Step 3: Verify deployment configuration**

Confirm the function returns a configuration error without `OPENAI_API_KEY`, then set the Vercel secret and run a real portrait generation before production sign-off.
