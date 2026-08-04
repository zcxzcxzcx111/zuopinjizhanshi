# Particle Density Increase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase the portrait dissolve density to the approved A tier without changing the existing flow path, palette, timing, light absorption, or reverse-scroll behavior.

**Architecture:** Keep the current deterministic canvas particle system in `script.js`. Change only the desktop/mobile hard caps and sampling interval, then lock those values with the existing contract test and verify the real scroll transition in the browser.

**Tech Stack:** Vanilla JavaScript, Canvas 2D, CSS custom properties, Node.js contract tests, in-app browser QA.

## Global Constraints

- Desktop particle cap must be exactly `14000`.
- Mobile particle cap must be exactly `5000`.
- Desktop sampling step must be exactly `5px`; mobile sampling step must be exactly `7px`.
- Preserve deterministic sampling, quadratic Bézier routing, purple-white light absorption, reverse scrolling, and device pixel ratio cap `2`.
- Do not change particle size, colors, light strength, dissolve timing, or page overlap timing.

---

### Task 1: Increase particle sampling density and verify the handoff

**Files:**
- Modify: `tests/portrait-transition.test.cjs:33-38`
- Modify: `script.js:155-156`
- Modify: `script.js:263`

**Interfaces:**
- Consumes: `initPortraitParticles()` and its existing `MAX_DESKTOP_PARTICLES`, `MAX_MOBILE_PARTICLES`, `isMobile`, `step`, and `maxParticles` variables.
- Produces: The same `portraitprogress`-driven canvas renderer with denser deterministic sampling; no public interface changes.

- [ ] **Step 1: Update the contract test first**

Replace the old cap assertions and add a sampling-step assertion:

```js
assert.match(js, /MAX_DESKTOP_PARTICLES\s*=\s*14000/);
assert.match(js, /MAX_MOBILE_PARTICLES\s*=\s*5000/);
assert.match(js, /const step = isMobile \? 7 : 5/);
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run:

```powershell
node tests/portrait-transition.test.cjs
```

Expected: FAIL because `script.js` still contains desktop `9000`, mobile `3500`, and sampling step `9 : 6`.

- [ ] **Step 3: Apply the approved A-tier constants**

In `initPortraitParticles()`, replace the existing values with:

```js
const MAX_DESKTOP_PARTICLES = 14000;
const MAX_MOBILE_PARTICLES = 5000;
```

In `buildPortraitParticles()`, replace the sampling line with:

```js
const step = isMobile ? 7 : 5;
```

Do not change `maxParticles`, `stride`, `particles`, route coordinates, timing, colors, or drawing size.

- [ ] **Step 4: Run automated verification**

Run:

```powershell
node --check script.js
node tests/portrait-transition.test.cjs
git diff --check
```

Expected:

- `node --check` exits with code `0`.
- Contract test prints `portrait transition contracts passed`.
- `git diff --check` reports no whitespace errors.

- [ ] **Step 5: Verify desktop and mobile behavior in the browser**

Desktop viewport `1280 × 720`:

1. Open `http://localhost:5181/%E4%BD%9C%E5%93%81%E5%B1%95%E7%A4%BA%E9%A1%B5%202/`.
2. Scroll to approximately `55%–65%` portrait progress.
3. Confirm the particle field is visibly denser, still flows down-left into the purple-white light, and does not obscure the second-page heading.
4. Scroll to the end and confirm the particle field fully merges into the light.
5. Scroll back to the top and confirm the portrait reconstructs completely.

Mobile viewport `390 × 844`:

1. Reload the same page.
2. Scroll through the mid-transition.
3. Confirm no horizontal overflow, no hard page seam, and no stalled particle remnants.

Expected: the selected A-tier density is visibly fuller on both layouts and the existing reversible handoff remains intact.

- [ ] **Step 6: Commit and push the implementation**

```powershell
git add script.js tests/portrait-transition.test.cjs
git commit -m "Increase portrait particle density"
git push origin main
```

Expected: the new commit is present on `origin/main`, and `git status --short` is empty.
