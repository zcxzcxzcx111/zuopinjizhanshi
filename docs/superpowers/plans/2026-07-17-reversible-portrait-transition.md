# Reversible Portrait Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved portrait cover to the real portfolio and make scrolling between the portrait cover and project content reversible without a black frame or accidental exits.

**Architecture:** The production page uses a real introductory DOM section before the existing portfolio content, so native document scrolling provides reliable forward and reverse navigation. The standalone prototype keeps its same-origin iframe, but wraps its wheel handling in a small three-state controller with a top-edge intent threshold. CSS animates only transforms and opacity, with reduced-motion fallbacks.

**Tech Stack:** Semantic HTML5, CSS custom properties and transforms, vanilla JavaScript, Node.js static contract tests, local HTTP server, in-app browser visual verification.

## Global Constraints

- Project-page upward scrolling must behave normally until the page reaches `scrollY <= 8`.
- A second clear upward intent at the top returns to the portrait cover.
- Forward and reverse transitions must not show black frames, blank frames, or duplicated project content.
- Repeated wheel inertia must not cause re-entry while the return animation is active.
- Support mouse wheels, trackpads, narrow viewports, Escape, and `prefers-reduced-motion`.
- Preserve all existing portfolio copy exactly.

---

### Task 1: Add Production Portrait Cover and Native Reversible Scroll

**Files:**
- Modify: `index.html:18-58`
- Modify: `styles.css:1027-1160`
- Modify: `script.js`
- Create: `tests/portrait-transition.test.cjs`

**Interfaces:**
- Consumes: existing `.global-video`, `.navbar`, `.main-content`, and `assets/hero-portrait-silhouette.png`.
- Produces: `#portrait-intro`, `.portrait-intro__figure`, `.portrait-intro__title-lockup`, and `initPortraitTransition(): void`.

- [ ] **Step 1: Write the failing production contract test**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');

assert.match(html, /id="portrait-intro"/);
assert.match(html, /assets\/hero-portrait-silhouette\.png/);
assert.match(html, /AI项目作品集/);
assert.match(html, /周呈祥/);
assert.match(css, /\.portrait-intro\s*\{/);
assert.match(css, /prefers-reduced-motion/);
assert.match(js, /function initPortraitTransition\(\)/);
assert.match(js, /requestAnimationFrame/);
console.log('portrait transition contracts passed');
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `node tests/portrait-transition.test.cjs`

Expected: `AssertionError` because `#portrait-intro` does not exist yet.

- [ ] **Step 3: Insert the portrait cover before the existing navigation and main content**

Add a semantic `section#portrait-intro` containing the transparent silhouette asset, the vertical `AI项目作品集 / 01 PORTFOLIO / 周呈祥` lockup, and a `SCROLL TO ENTER` cue. Keep the existing navbar and every existing text node unchanged after the section.

```html
<section id="portrait-intro" class="portrait-intro" aria-label="周呈祥 AI项目作品集封面">
  <div class="portrait-intro__title-lockup">
    <strong class="portrait-intro__work-title">AI项目作品集</strong>
    <span class="portrait-intro__rule" aria-hidden="true"></span>
    <span class="portrait-intro__identity">
      <small>01 / PORTFOLIO</small>
      <b>周呈祥</b>
    </span>
  </div>
  <img class="portrait-intro__figure" src="assets/hero-portrait-silhouette.png" alt="周呈祥人物剪影">
  <a class="portrait-intro__scroll" href="#hero">SCROLL TO ENTER</a>
</section>
```

- [ ] **Step 4: Add cover layout and scroll-linked visual styles**

Use a `min-height: 100svh` intro, place the enlarged silhouette slightly left of the right edge, place the vertical lockup farther right, and animate with `--portrait-progress`. Use `overflow-x: clip`, `transform`, and `opacity`; add mobile and reduced-motion media queries.

```css
.portrait-intro { min-height: 100svh; position: relative; overflow: clip; isolation: isolate; }
.portrait-intro__figure { position: absolute; right: 13vw; bottom: -10svh; height: 110svh; transform: translate3d(0, calc(var(--portrait-progress, 0) * -3vh), 0); }
.portrait-intro__title-lockup { position: absolute; right: 6vw; top: 50%; display: flex; gap: 14px; writing-mode: vertical-rl; transform: translateY(-50%); }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } .portrait-intro__figure, .portrait-intro__title-lockup { transition: none; transform: none; } }
```

- [ ] **Step 5: Add the production scroll-progress controller**

Implement a requestAnimationFrame-throttled function that maps the intro's viewport position to `--portrait-progress`. Do not lock the document or intercept the wheel in production; native document flow makes reverse scrolling reliable.

```js
function initPortraitTransition() {
    const intro = document.getElementById('portrait-intro');
    if (!intro) return;
    let queued = false;
    const draw = () => {
        const progress = Math.min(1, Math.max(0, -intro.getBoundingClientRect().top / Math.max(1, intro.offsetHeight)));
        document.documentElement.style.setProperty('--portrait-progress', progress.toFixed(4));
        queued = false;
    };
    addEventListener('scroll', () => {
        if (!queued) requestAnimationFrame(draw);
        queued = true;
    }, { passive: true });
    draw();
}
initPortraitTransition();
```

- [ ] **Step 6: Run the production contract test**

Run: `node tests/portrait-transition.test.cjs`

Expected: `portrait transition contracts passed`.

- [ ] **Step 7: Commit the production cover**

```powershell
git add index.html styles.css script.js tests/portrait-transition.test.cjs assets/hero-portrait-silhouette.png
git commit -m "Add reversible portrait portfolio cover"
```

### Task 2: Harden Prototype Reverse-Wheel Behavior

**Files:**
- Modify: `.superpowers/brainstorm/headline-font-options-20260717/content/portrait-right-no-frame-v3.html:31-67`
- Modify: `tests/portrait-transition.test.cjs`

**Interfaces:**
- Consumes: prototype `revealFrame`, `entered`, `returning`, and `exitIntro()`.
- Produces: `bindReverseWheel(): void`, `resetReverseIntent(): void`, and `data-return-triggered` diagnostics.

- [ ] **Step 1: Extend the contract test for top-edge intent handling**

```js
const prototype = fs.readFileSync('.superpowers/brainstorm/headline-font-options-20260717/content/portrait-right-no-frame-v3.html', 'utf8');
assert.match(prototype, /TOP_EDGE_PX\s*=\s*8/);
assert.match(prototype, /RETURN_INTENT_THRESHOLD\s*=\s*24/);
assert.match(prototype, /upwardIntent/);
assert.match(prototype, /touchmove/);
assert.match(prototype, /exitIntro\(\)/);
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `node tests/portrait-transition.test.cjs`

Expected: `AssertionError` because the threshold constants and touch handler do not exist.

- [ ] **Step 3: Replace immediate wheel exit with an intent accumulator**

```js
const TOP_EDGE_PX = 8;
const RETURN_INTENT_THRESHOLD = 24;
let upwardIntent = 0;

function resetReverseIntent() { upwardIntent = 0; }

function requestReturn(deltaY, frameWindow) {
  document.body.dataset.frameScroll = String(Math.round(frameWindow.scrollY));
  if (!entered || frameWindow.scrollY > TOP_EDGE_PX || deltaY >= 0) {
    resetReverseIntent();
    return false;
  }
  upwardIntent += Math.abs(deltaY);
  if (upwardIntent < RETURN_INTENT_THRESHOLD) return false;
  document.body.dataset.returnTriggered = 'true';
  resetReverseIntent();
  exitIntro();
  return true;
}
```

- [ ] **Step 4: Bind wheel and touch gestures inside the same-origin iframe**

On `wheel`, call `requestReturn(event.deltaY, frameWindow)` and prevent default only when it returns true. For touch, record `touchstart.clientY`, convert upward movement at the top into a negative delta, and call the same function. Reset intent when the frame scrolls away from the top.

- [ ] **Step 5: Run the combined contract test**

Run: `node tests/portrait-transition.test.cjs`

Expected: `portrait transition contracts passed`.

- [ ] **Step 6: Commit the prototype logic if tracked**

The `.superpowers` prototype is intentionally ignored, so verify behavior locally and do not force-add it. Commit only the tracked test update with the production task if it has not already been committed.

### Task 3: Browser Verification and Delivery

**Files:**
- Verify: `index.html`
- Verify: `.superpowers/brainstorm/headline-font-options-20260717/content/portrait-right-no-frame-v3.html`

**Interfaces:**
- Consumes: local server at `http://127.0.0.1:5181/作品展示页%202/`.
- Produces: verified forward/reverse transition on desktop and narrow viewport.

- [ ] **Step 1: Start or confirm the local server**

Run: `node serve-portfolio.cjs`

Expected: `Portfolio server: http://127.0.0.1:5181/作品展示页%202/`.

- [ ] **Step 2: Verify production forward and reverse scrolling**

Open the production URL, scroll from the silhouette page to the project page, scroll the project content down and back up, then continue upward. Expected: the silhouette page returns naturally with no black gap. Repeat three times.

- [ ] **Step 3: Verify prototype intent threshold**

Open the same-origin prototype URL. Enter the iframe, scroll its content down and back to the top, then issue one additional upward gesture. Expected: `data-return-triggered="true"`, followed by a smooth return to the silhouette page.

- [ ] **Step 4: Verify narrow viewport and reduced motion**

Test at approximately 390px width and emulate reduced motion. Expected: silhouette and vertical lockup remain visible without horizontal overflow; the transition remains reversible without smooth-motion dependence.

- [ ] **Step 5: Run final automated check**

Run: `node tests/portrait-transition.test.cjs`

Expected: `portrait transition contracts passed`.

- [ ] **Step 6: Commit verification-related fixes and push**

```powershell
git add index.html styles.css script.js tests/portrait-transition.test.cjs docs/superpowers/plans/2026-07-17-reversible-portrait-transition.md
git commit -m "Polish reversible portrait transition"
git push origin main
```
