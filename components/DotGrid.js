/* ==========================================================================
   DotGrid — Vanilla JS Engine (port from @react-bits/DotGrid-JS-CSS)
   Zero Dependencies — No GSAP / No React
   ========================================================================== */

(function () {
    'use strict';

    // ---- Helpers ----
    function hexToRgb(hex) {
        const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (!m) return { r: 0, g: 0, b: 0 };
        return {
            r: parseInt(m[1], 16),
            g: parseInt(m[2], 16),
            b: parseInt(m[3], 16),
        };
    }

    function throttle(fn, ms) {
        let last = 0;
        return function () {
            const now = performance.now();
            if (now - last >= ms) {
                last = now;
                fn.apply(this, arguments);
            }
        };
    }

    // ---- Config ----
    const CONFIG = {
        dotSize: 6,
        gap: 15,
        baseColor: '#2F293A',
        activeColor: '#5227FF',
        proximity: 120,
        speedTrigger: 100,
        shockRadius: 120,
        shockStrength: 1.2,
        maxSpeed: 5000,
        resistance: 750,
        returnDuration: 0.5,
    };

    const baseRgb = hexToRgb(CONFIG.baseColor);
    const activeRgb = hexToRgb(CONFIG.activeColor);

    // ---- State ----
    let wrapper, canvas, ctx, circlePath;
    let dots = [];
    let pointer = { x: -9999, y: -9999, vx: 0, vy: 0, speed: 0, lastTime: 0, lastX: 0, lastY: 0 };
    let rafId;

    // ---- Build Grid ----
    function buildGrid() {
        if (!wrapper || !canvas) return;
        const rect = wrapper.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);

        const { dotSize, gap } = CONFIG;
        const cols = Math.floor((width + gap) / (dotSize + gap));
        const rows = Math.floor((height + gap) / (dotSize + gap));
        const cell = dotSize + gap;
        const gridW = cell * cols - gap;
        const gridH = cell * rows - gap;
        const startX = (width - gridW) / 2 + dotSize / 2;
        const startY = (height - gridH) / 2 + dotSize / 2;

        dots = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                dots.push({
                    cx: startX + x * cell,
                    cy: startY + y * cell,
                    xOffset: 0,
                    yOffset: 0,
                    // Spring state
                    vx: 0,
                    vy: 0,
                    targetX: 0,
                    targetY: 0,
                    _animating: false,
                    _returnAnim: null,
                });
            }
        }
    }

    // ---- Draw Loop ----
    function draw() {
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

        const proxSq = CONFIG.proximity * CONFIG.proximity;
        const { x: px, y: py } = pointer;

        for (const dot of dots) {
            const ox = dot.cx + dot.xOffset;
            const oy = dot.cy + dot.yOffset;
            const dx = dot.cx - px;
            const dy = dot.cy - py;
            const dsq = dx * dx + dy * dy;

            let color = CONFIG.baseColor;
            if (dsq <= proxSq) {
                const dist = Math.sqrt(dsq);
                const t = 1 - dist / CONFIG.proximity;
                const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
                const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
                const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
                color = 'rgb(' + r + ',' + g + ',' + b + ')';
            }

            ctx.save();
            ctx.translate(ox, oy);
            ctx.fillStyle = color;
            ctx.fill(circlePath);
            ctx.restore();
        }

        rafId = requestAnimationFrame(draw);
    }

    // ---- Spring Physics (replaces GSAP InertiaPlugin) ----
    function springAnimate(dot, pushX, pushY) {
        dot._animating = true;
        dot.targetX = pushX;
        dot.targetY = pushY;
        dot.xOffset = 0;
        dot.yOffset = 0;
        dot.vx = pushX * 1.2; // Controlled initial push so particles never overlap
        dot.vy = pushY * 1.2;

        const stiffness = 0.18;
        const damping = 0.65;
        let lastFrame = performance.now();

        function tick(now) {
            const dt = Math.min((now - lastFrame) / 16.67, 3); // normalize to ~60fps
            lastFrame = now;

            // Move toward target with spring force
            const ax = (dot.targetX - dot.xOffset) * stiffness * dt;
            const ay = (dot.targetY - dot.yOffset) * stiffness * dt;
            dot.vx = (dot.vx + ax) * damping;
            dot.vy = (dot.vy + ay) * damping;
            dot.xOffset += dot.vx * dt;
            dot.yOffset += dot.vy * dt;

            // Check if settled near target
            const speed = Math.abs(dot.vx) + Math.abs(dot.vy);
            const dist = Math.abs(dot.xOffset - dot.targetX) + Math.abs(dot.yOffset - dot.targetY);

            if (speed < 0.05 && dist < 0.1) {
                // Snap to target, then return to origin
                dot.xOffset = dot.targetX;
                dot.yOffset = dot.targetY;
                returnToOrigin(dot);
                return;
            }

            dot._returnAnim = requestAnimationFrame(tick);
        }

        if (dot._returnAnim) cancelAnimationFrame(dot._returnAnim);
        dot._returnAnim = requestAnimationFrame(tick);
    }

    function returnToOrigin(dot) {
        const duration = CONFIG.returnDuration * 1000;
        const startX = dot.xOffset;
        const startY = dot.yOffset;
        const startTime = performance.now();

        function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Smooth 1-second return curve
            const t = 1 - Math.pow(1 - progress, 3);
            dot.xOffset = startX * (1 - t);
            dot.yOffset = startY * (1 - t);

            if (progress < 1) {
                dot._returnAnim = requestAnimationFrame(tick);
            } else {
                dot.xOffset = 0;
                dot.yOffset = 0;
                dot._animating = false;
            }
        }

        if (dot._returnAnim) cancelAnimationFrame(dot._returnAnim);
        dot._returnAnim = requestAnimationFrame(tick);
    }

    // ---- Pointer Events ----
    function onMouseMove(e) {
        const now = performance.now();
        const dt = pointer.lastTime ? now - pointer.lastTime : 16;
        const dx = e.clientX - pointer.lastX;
        const dy = e.clientY - pointer.lastY;
        let vx = (dx / dt) * 1000;
        let vy = (dy / dt) * 1000;
        let speed = Math.hypot(vx, vy);

        if (speed > CONFIG.maxSpeed) {
            const s = CONFIG.maxSpeed / speed;
            vx *= s;
            vy *= s;
            speed = CONFIG.maxSpeed;
        }

        pointer.lastTime = now;
        pointer.lastX = e.clientX;
        pointer.lastY = e.clientY;
        pointer.vx = vx;
        pointer.vy = vy;
        pointer.speed = speed;

        const rect = canvas.getBoundingClientRect();
        pointer.x = e.clientX - rect.left;
        pointer.y = e.clientY - rect.top;

        for (const dot of dots) {
            const dist = Math.hypot(dot.cx - pointer.x, dot.cy - pointer.y);
            if (speed > CONFIG.speedTrigger && dist < CONFIG.proximity && !dot._animating) {
                // Strictly limit push distance to +/- 6px so particles never touch adjacent particles
                let rawX = (dot.cx - pointer.x) * 0.08 + vx * 0.0005;
                let rawY = (dot.cy - pointer.y) * 0.08 + vy * 0.0005;
                const pushX = Math.max(-6, Math.min(6, rawX));
                const pushY = Math.max(-6, Math.min(6, rawY));
                springAnimate(dot, pushX, pushY);
            }
        }
    }

    function onClick(e) {
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        for (const dot of dots) {
            const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
            if (dist < CONFIG.shockRadius && !dot._animating) {
                const falloff = Math.max(0, 1 - dist / CONFIG.shockRadius);
                let rawX = (dot.cx - cx) * 0.08 * CONFIG.shockStrength * falloff;
                let rawY = (dot.cy - cy) * 0.08 * CONFIG.shockStrength * falloff;
                const pushX = Math.max(-6, Math.min(6, rawX));
                const pushY = Math.max(-6, Math.min(6, rawY));
                springAnimate(dot, pushX, pushY);
            }
        }
    }

    function onMouseLeave() {
        pointer.x = -9999;
        pointer.y = -9999;
    }

    // ---- Init ----
    function init() {
        wrapper = document.querySelector('.dot-grid__wrap');
        canvas = document.querySelector('.dot-grid__canvas');
        if (!wrapper || !canvas) return;
        ctx = canvas.getContext('2d');

        // Circle path
        if (typeof Path2D !== 'undefined') {
            circlePath = new Path2D();
            circlePath.arc(0, 0, CONFIG.dotSize / 2, 0, Math.PI * 2);
        }

        buildGrid();
        draw();

        // ResizeObserver
        if ('ResizeObserver' in window) {
            new ResizeObserver(buildGrid).observe(wrapper);
        } else {
            window.addEventListener('resize', buildGrid);
        }

        // Pointer events
        window.addEventListener('mousemove', throttle(onMouseMove, 50), { passive: true });
        window.addEventListener('click', onClick);
        window.addEventListener('mouseleave', onMouseLeave);
    }

    // Expose for external use
    window.DotGridEngine = { init, buildGrid, CONFIG };

    // Auto-init on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
