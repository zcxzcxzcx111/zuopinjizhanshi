# Portrait Particle Dissolve Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the portrait silhouette into scroll-driven Canvas particles that disperse on entry and reassemble on return.

**Architecture:** A decorative full-cover Canvas samples the rendered transparent portrait at the same viewport coordinates as the source image. The existing portrait progress controller emits progress updates; a focused particle renderer converts those updates into deterministic positions and opacity, while the original image provides the stable fallback.

**Tech Stack:** HTML5 Canvas 2D, vanilla JavaScript, CSS custom properties, Node.js contract tests, local browser verification.

## Global Constraints

- Use no third-party animation dependency.
- Preserve the fixed navigation and all existing copy.
- Desktop particles: 6px sampling target and 9,000 maximum.
- Narrow-screen particles: 9px sampling target and 3,500 maximum.
- Device pixel ratio is capped at 2.
- `prefers-reduced-motion: reduce` disables drift and keeps an opacity-only fallback.
- Canvas/image failures retain the original portrait and never block scrolling.

---

### Task 1: Add Particle Layer Contracts

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `tests/portrait-transition.test.cjs`

**Interfaces:**
- Consumes: `.portrait-intro` and `.portrait-intro__figure`.
- Produces: `canvas.portrait-intro__particles[aria-hidden="true"]` and `.is-particle-ready`.

- [ ] Add failing assertions for the particle canvas, particle styles, and `initPortraitParticles()`.
- [ ] Run `node tests/portrait-transition.test.cjs`; expect an assertion failure for the missing canvas.
- [ ] Insert the decorative canvas immediately after the portrait image.
- [ ] Add absolute full-cover canvas CSS at z-index 3 and preserve title/navigation stacking.
- [ ] Run the contract test; expect JavaScript assertions to remain failing until Task 2.

### Task 2: Implement Deterministic Canvas Sampling and Rendering

**Files:**
- Modify: `script.js`
- Modify: `tests/portrait-transition.test.cjs`

**Interfaces:**
- Consumes: `portraitprogress` custom events with `{ progress: number }`.
- Produces: `initPortraitParticles(): void`, `buildPortraitParticles(): void`, and `renderPortraitParticles(progress: number): void`.

- [ ] Update `initPortraitTransition()` to dispatch `portraitprogress` after writing `--portrait-progress`.
- [ ] In `initPortraitParticles()`, decode the image, size the Canvas to the intro, draw the portrait into an offscreen Canvas, and sample pixels with alpha above 32.
- [ ] Generate deterministic particle delay, drift, size, and tint values from sampled coordinates; cap particle count by viewport class.
- [ ] Render progress `0.00–0.12` as a stable image, `0.12–0.72` as edge-led dispersion, and `0.72–1.00` as final drift/fade.
- [ ] Rebuild samples on resize and stop drawing while the intro is outside the nearby viewport.
- [ ] Keep the original image visible when decoding or `getImageData()` fails.
- [ ] Run `node tests/portrait-transition.test.cjs`; expect `portrait transition contracts passed`.

### Task 3: Mirror the Effect in the Visual Prototype

**Files:**
- Modify: `.superpowers/brainstorm/headline-font-options-20260717/content/portrait-right-no-frame-v3.html`
- Modify: `serve-portfolio.cjs`

**Interfaces:**
- Consumes: prototype `--p`, `.portrait`, and the local asset server.
- Produces: `canvas.particles`, cross-origin-safe local image sampling, and reverse aggregation driven by `--p`.

- [ ] Add `Access-Control-Allow-Origin: *` to local static responses and `crossorigin="anonymous"` to the prototype portrait image.
- [ ] Add a prototype Canvas above the portrait and sample its rendered pixels after load.
- [ ] Call the prototype particle renderer from `draw()` using the same progress value used by the page transition.
- [ ] Preserve the enlarged portrait, fixed navigation, title layout, and reverse-wheel controller.

### Task 4: Verify, Commit, and Push

**Files:**
- Verify: `index.html`, `styles.css`, `script.js`, `serve-portfolio.cjs`, and the prototype HTML.

**Interfaces:**
- Consumes: local URLs on ports 5181 and 64049.
- Produces: validated desktop, narrow-screen, forward, and reverse behavior.

- [ ] Restart the scoped local server so its CORS header is active.
- [ ] Verify desktop: fixed navigation, enlarged title/portrait, particle dispersion, no black seam, and reverse aggregation.
- [ ] Verify 390px viewport and reduced motion.
- [ ] Repeat forward/reverse scrolling three times and inspect console errors.
- [ ] Run `node tests/portrait-transition.test.cjs` and `git diff --check`.
- [ ] Commit tracked implementation files and push `main` to `origin`.
