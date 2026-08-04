# Portrait Particles-to-Light Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the homepage silhouette dissolve into a directed particle stream that is absorbed by the second page's left purple-white light field while the second page enters early and the full transition remains reversible.

**Architecture:** Keep the existing single-document sticky cover and Canvas sampler. Add one decorative light-field layer, enrich sampled particles with deterministic Bézier targets inside the left light zone, and drive the silhouette, particles, light field, feather, and second-page entry from the same requestAnimationFrame scroll progress.

**Tech Stack:** HTML5, CSS custom properties, Canvas 2D, vanilla JavaScript, Node.js contract tests.

## Global Constraints

- Keep all existing page copy, navigation links, project content, and fixed navbar unchanged.
- Reuse the existing Canvas particle system; add no third-party animation dependency.
- Desktop particle limit stays at 9,000; narrow-screen limit stays at 3,500.
- Particle palette is 80% deep indigo, 15% purple, and 5% highlight white.
- Second-page reveal begins when transition progress reaches approximately 18%.
- The transition must be fully reversible during upward scrolling.
- `prefers-reduced-motion` replaces particle flow with a short fade handoff.

---

## File Structure

- `index.html`: owns the semantic cover structure and decorative light-field element.
- `styles.css`: owns sticky overlap, feathering, light-field appearance, responsive behavior, and reduced-motion fallback.
- `script.js`: owns normalized scroll progress, deterministic particle sampling, directed particle motion, and reverse rendering.
- `tests/portrait-transition.test.cjs`: guards the required markup, CSS variables, particle target data, limits, and prototype transition contract.
- `.superpowers/brainstorm/headline-font-options-20260717/content/portrait-right-no-frame-v3.html`: keeps the standalone prototype's reveal easing consistent with production.

### Task 1: Lock the particles-to-light contract

**Files:**
- Modify: `tests/portrait-transition.test.cjs`

**Interfaces:**
- Consumes: production HTML, CSS, JavaScript, and the existing standalone prototype as UTF-8 strings.
- Produces: assertions for `.portrait-intro__light-field`, `--portrait-light-progress`, deterministic target/control coordinates, and reversible prototype easing.

- [ ] **Step 1: Write the failing assertions**

```js
assert.match(html, /class="portrait-intro__light-field"/);
assert.match(css, /--portrait-light-progress\s*:/);
assert.match(css, /\.portrait-intro__light-field\s*\{/);
assert.match(js, /const lightProgress = smoothstep\(/);
assert.match(js, /targetX:/);
assert.match(js, /targetY:/);
assert.match(js, /controlX:/);
assert.match(js, /controlY:/);
assert.match(js, /drawAbsorbedGlow/);
assert.match(prototype, /--ease-p/);
assert.match(prototype, /mask-image/);
```

- [ ] **Step 2: Run the contract test and verify failure**

Run: `node tests/portrait-transition.test.cjs`

Expected: FAIL at the first missing light-field or directed-particle assertion.

- [ ] **Step 3: Commit only after Tasks 2–4 make the contract pass**

No standalone test-only commit; keep the failing assertions visible while implementing the feature.

### Task 2: Add the shared left light field and overlap layers

**Files:**
- Modify: `index.html:30-48`
- Modify: `styles.css:1159-1400`

**Interfaces:**
- Consumes: `--portrait-progress`, `--portrait-eased-progress`, `--handoff-progress`, and the existing `.portrait-intro__stage`.
- Produces: `.portrait-intro__light-field`, `--portrait-light-progress`, and a feathered overlap that the particle renderer visually targets.

- [ ] **Step 1: Add the decorative light field inside the sticky stage**

```html
<div class="portrait-intro__stage">
    <div class="portrait-intro__light-field" aria-hidden="true"></div>
    <!-- existing rail, title, figure, canvas, and scroll cue stay unchanged -->
</div>
```

- [ ] **Step 2: Define the light progress variable and light layer**

```css
:root {
    --portrait-light-progress: 0;
}

.portrait-intro__light-field {
    position: absolute;
    inset: -12% 38% -10% -18%;
    z-index: 1;
    background:
        radial-gradient(ellipse at 34% 42%, rgba(255, 249, 255, 0.92), rgba(201, 125, 255, 0.58) 15%, rgba(111, 63, 230, 0.28) 38%, transparent 72%);
    filter: blur(14px);
    opacity: var(--portrait-light-progress);
    transform: scale3d(calc(0.82 + var(--portrait-light-progress) * 0.18), 1, 1);
    transform-origin: 24% 50%;
    pointer-events: none;
    will-change: opacity, transform;
}
```

- [ ] **Step 3: Preserve embedded and reduced-motion behavior**

```css
body.embedded-portfolio .portrait-intro__light-field { display: none; }

@media (prefers-reduced-motion: reduce) {
    .portrait-intro__light-field { display: none; }
}
```

- [ ] **Step 4: Run the contract test**

Run: `node tests/portrait-transition.test.cjs`

Expected: still FAIL because directed particle target data is not implemented yet.

### Task 3: Direct particles into the light and merge them into glow

**Files:**
- Modify: `script.js:101-280`

**Interfaces:**
- Consumes: stage dimensions, sampled silhouette alpha, deterministic `hash(x, y, salt)`, and normalized `progress`.
- Produces: particle records containing `{ x, y, targetX, targetY, controlX, controlY, size, delay, palette }`, plus `drawAbsorbedGlow(progress)`.

- [ ] **Step 1: Drive the light field from the shared scroll loop**

```js
const lightProgress = smoothstep(0.18, 0.9, progress);
document.documentElement.style.setProperty('--portrait-light-progress', lightProgress.toFixed(4));
dispatchEvent(new CustomEvent('portraitprogress', {
    detail: { progress, easedProgress, handoffProgress, lightProgress }
}));
```

- [ ] **Step 2: Add deterministic palette and Bézier helpers**

```js
const quadraticPoint = (start, control, end, amount) => {
    const inverse = 1 - amount;
    return inverse * inverse * start + 2 * inverse * amount * control + amount * amount * end;
};

const particleColor = (tone) => {
    if (tone > 0.95) return '#f4eaff';
    if (tone > 0.8) return '#9766ef';
    return '#111a35';
};
```

- [ ] **Step 3: Store light-zone targets during particle sampling**

```js
const targetX = width * (0.08 + hash(x, y, 10) * 0.24);
const targetY = Math.min(height * 0.94, y + height * (0.08 + hash(x, y, 11) * 0.24));
sampled.push({
    x,
    y,
    targetX,
    targetY,
    controlX: Math.min(x - 24, (x + targetX) * 0.5 - width * 0.08),
    controlY: y + (targetY - y) * 0.36 + (hash(x, y, 12) - 0.5) * 70,
    wave: 3 + hash(x, y, 4) * 15,
    phase: hash(x, y, 5) * Math.PI * 2,
    size: 1 + hash(x, y, 6) * 2,
    delay: edge ? hash(x, y, 7) * 0.12 : 0.18 + hash(x, y, 8) * 0.42,
    tone: hash(x, y, 9)
});
```

- [ ] **Step 4: Render the flow and absorption phase**

```js
const routeProgress = local * local * (3 - 2 * local);
const absorption = clamp((local - 0.58) / 0.42);
const turbulence = Math.sin(local * Math.PI * 2 + particle.phase) * particle.wave * (1 - absorption);
const x = quadraticPoint(particle.x, particle.controlX, particle.targetX, routeProgress) + turbulence;
const y = quadraticPoint(particle.y, particle.controlY, particle.targetY, routeProgress);
const size = particle.size * (1 + absorption * 1.8);
const alpha = Math.pow(1 - local, 0.92) * Math.min(1, 0.42 + dissolve * 2.7);

context.globalAlpha = alpha;
context.fillStyle = particleColor(particle.tone);
context.fillRect(x, y, size, size);
```

- [ ] **Step 5: Add a low-frequency absorbed glow to the Canvas**

```js
function drawAbsorbedGlow(progress, width, height) {
    const glow = clamp((progress - 0.44) / 0.46);
    if (glow <= 0) return;
    const gradient = context.createRadialGradient(width * 0.2, height * 0.48, 0, width * 0.2, height * 0.48, width * 0.42);
    gradient.addColorStop(0, `rgba(245, 231, 255, ${0.2 * glow})`);
    gradient.addColorStop(0.3, `rgba(160, 91, 244, ${0.14 * glow})`);
    gradient.addColorStop(1, 'rgba(71, 43, 160, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width * 0.62, height);
}
```

- [ ] **Step 6: Call the glow after particles and keep reversal stateless**

```js
for (const particle of particles) {
    // render deterministic particle position directly from current progress
}
drawAbsorbedGlow(dissolve, width, height);
context.globalAlpha = 1;
```

Do not persist per-particle velocity or completion flags. Rendering from current progress makes upward scrolling reconstruct the exact prior frame.

- [ ] **Step 7: Run syntax and contract checks**

Run: `node --check script.js`

Expected: no output and exit code 0.

Run: `node tests/portrait-transition.test.cjs`

Expected: only prototype easing assertions may still fail.

### Task 4: Synchronize prototype easing and feathering

**Files:**
- Modify: `.superpowers/brainstorm/headline-font-options-20260717/content/portrait-right-no-frame-v3.html`

**Interfaces:**
- Consumes: existing prototype `--p` scroll progress and `.reveal` iframe layer.
- Produces: `--ease-p`, smoothstep reveal movement, and an 18vh top feather mask.

- [ ] **Step 1: Add eased progress**

```js
const smoothstep = value => {
    const clamped = clamp(value);
    return clamped * clamped * (3 - 2 * clamped);
};

root.style.setProperty('--p', p.toFixed(4));
root.style.setProperty('--ease-p', smoothstep(p).toFixed(4));
```

- [ ] **Step 2: Feather and ease the project reveal**

```css
:root { --p: 0; --ease-p: 0; }

.reveal {
    transform: translateY(calc((1 - var(--ease-p)) * 100%));
    box-shadow: 0 -88px 150px rgba(4, 3, 9, 0.62);
    mask-image: linear-gradient(to bottom, transparent 0, #000 18vh);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 18vh);
}
```

- [ ] **Step 3: Run all automated checks**

Run: `node --check script.js`

Expected: PASS with no output.

Run: `node tests/portrait-transition.test.cjs`

Expected: `portrait transition contracts passed`.

Run: `git diff --check`

Expected: no whitespace errors.

### Task 5: Browser QA, commit, and publish

**Files:**
- Verify: `http://localhost:5181/作品展示页%202/`
- Verify: `http://localhost:64049/`

**Interfaces:**
- Consumes: the complete production and prototype transition.
- Produces: visual confirmation for forward/reverse scrolling and a GitHub `main` commit.

- [ ] **Step 1: Verify desktop forward scroll**

At 1440×900, confirm the second page is visible by approximately 18% progress, particles travel toward the left glow, and no black horizontal seam appears.

- [ ] **Step 2: Verify reverse scroll**

Scroll into the second page, then return upward. Confirm the light contracts into particles and the silhouette reconstructs without a one-frame flash.

- [ ] **Step 3: Verify narrow viewport and reduced motion**

At 390×844, confirm the tail is shorter, content remains readable, and the navbar stays fixed. Emulate reduced motion and confirm particle Canvas is hidden while the page remains navigable.

- [ ] **Step 4: Commit the production implementation**

```powershell
& $gitExe add -- index.html styles.css script.js tests/portrait-transition.test.cjs `
  docs/superpowers/plans/2026-07-18-overlap-scroll-handoff.md `
  docs/superpowers/specs/2026-07-18-overlap-scroll-handoff-design.md `
  docs/superpowers/plans/2026-07-18-portrait-particles-to-light-handoff.md
& $gitExe commit -m "Add particles-to-light portfolio handoff"
```

Expected: one commit containing the sticky overlap baseline plus the selected particles-to-light behavior. `.superpowers/` visual prototypes remain ignored.

- [ ] **Step 5: Push GitHub main**

```powershell
& $gitExe push origin main
```

Expected: remote `main` advances to the new implementation commit.
