import React, { useEffect, useRef, useCallback } from 'react';

/**
 * DotGrid — Interactive Spring/Shockwave Particle Grid
 * Fully preserved animation logic from @react-bits/DotGrid-JS-CSS
 */
export function DotGrid({
    dotSize = 6,
    gap = 15,
    baseColor = '#2F293A',
    activeColor = '#5227FF',
    proximity = 120,
    speedTrigger = 100,
    shockRadius = 120,
    shockStrength = 1.2,
    maxSpeed = 5000,
    resistance = 750,
    returnDuration = 0.5,
    className = '',
    style = {}
}) {
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);
    const dotsRef = useRef([]);
    const pointerRef = useRef({ x: -9999, y: -9999, vx: 0, vy: 0, lastTime: 0, lastX: 0, lastY: 0 });
    const rafRef = useRef(null);

    const hexToRgb = (hex) => {
        const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (!m) return { r: 0, g: 0, b: 0 };
        return {
            r: parseInt(m[1], 16),
            g: parseInt(m[2], 16),
            b: parseInt(m[3], 16),
        };
    };

    const baseRgb = hexToRgb(baseColor);
    const activeRgb = hexToRgb(activeColor);

    const buildGrid = useCallback(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas) return;

        const rect = wrap.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);

        const cols = Math.floor((width + gap) / (dotSize + gap));
        const rows = Math.floor((height + gap) / (dotSize + gap));
        const cell = dotSize + gap;
        const gridW = cell * cols - gap;
        const gridH = cell * rows - gap;
        const startX = (width - gridW) / 2 + dotSize / 2;
        const startY = (height - gridH) / 2 + dotSize / 2;

        const dots = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                dots.push({
                    cx: startX + x * cell,
                    cy: startY + y * cell,
                    xOffset: 0,
                    yOffset: 0,
                    vx: 0,
                    vy: 0,
                    targetX: 0,
                    targetY: 0,
                    _animating: false,
                    _returnAnim: null,
                });
            }
        }
        dotsRef.current = dots;
    }, [dotSize, gap]);

    const returnToOrigin = useCallback((dot) => {
        const duration = returnDuration * 1000;
        const startX = dot.xOffset;
        const startY = dot.yOffset;
        const startTime = performance.now();

        function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
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
    }, [returnDuration]);

    const springAnimate = useCallback((dot, pushX, pushY) => {
        dot._animating = true;
        dot.targetX = pushX;
        dot.targetY = pushY;
        dot.xOffset = 0;
        dot.yOffset = 0;
        dot.vx = pushX * 1.2;
        dot.vy = pushY * 1.2;

        const stiffness = 0.18;
        const damping = 0.65;
        let lastFrame = performance.now();

        function tick(now) {
            const dt = Math.min((now - lastFrame) / 16.67, 3);
            lastFrame = now;

            const ax = (dot.targetX - dot.xOffset) * stiffness * dt;
            const ay = (dot.targetY - dot.yOffset) * stiffness * dt;
            dot.vx = (dot.vx + ax) * damping;
            dot.vy = (dot.vy + ay) * damping;
            dot.xOffset += dot.vx * dt;
            dot.yOffset += dot.vy * dt;

            const speed = Math.abs(dot.vx) + Math.abs(dot.vy);
            const dist = Math.abs(dot.xOffset - dot.targetX) + Math.abs(dot.yOffset - dot.targetY);

            if (speed < 0.05 && dist < 0.1) {
                dot.xOffset = dot.targetX;
                dot.yOffset = dot.targetY;
                returnToOrigin(dot);
                return;
            }

            dot._returnAnim = requestAnimationFrame(tick);
        }

        if (dot._returnAnim) cancelAnimationFrame(dot._returnAnim);
        dot._returnAnim = requestAnimationFrame(tick);
    }, [returnToOrigin]);

    useEffect(() => {
        buildGrid();

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const circlePath = new Path2D();
        circlePath.arc(0, 0, dotSize / 2, 0, Math.PI * 2);

        const draw = () => {
            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

            const proxSq = proximity * proximity;
            const { x: px, y: py } = pointerRef.current;

            for (const dot of dotsRef.current) {
                const ox = dot.cx + dot.xOffset;
                const oy = dot.cy + dot.yOffset;
                const dx = dot.cx - px;
                const dy = dot.cy - py;
                const dsq = dx * dx + dy * dy;

                let color = baseColor;
                if (dsq <= proxSq) {
                    const dist = Math.sqrt(dsq);
                    const t = 1 - dist / proximity;
                    const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
                    const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
                    const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
                    color = `rgb(${r},${g},${b})`;
                }

                ctx.save();
                ctx.translate(ox, oy);
                ctx.fillStyle = color;
                ctx.fill(circlePath);
                ctx.restore();
            }

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);

        let resizeObserver;
        if ('ResizeObserver' in window && wrapRef.current) {
            resizeObserver = new ResizeObserver(() => buildGrid());
            resizeObserver.observe(wrapRef.current);
        } else {
            window.addEventListener('resize', buildGrid);
        }

        const handleMouseMove = (e) => {
            const now = performance.now();
            const dt = pointerRef.current.lastTime ? now - pointerRef.current.lastTime : 16;
            const dx = e.clientX - pointerRef.current.lastX;
            const dy = e.clientY - pointerRef.current.lastY;
            let vx = (dx / dt) * 1000;
            let vy = (dy / dt) * 1000;
            let speed = Math.hypot(vx, vy);

            if (speed > maxSpeed) {
                const s = maxSpeed / speed;
                vx *= s;
                vy *= s;
                speed = maxSpeed;
            }

            pointerRef.current.lastTime = now;
            pointerRef.current.lastX = e.clientX;
            pointerRef.current.lastY = e.clientY;
            pointerRef.current.vx = vx;
            pointerRef.current.vy = vy;

            const rect = canvas.getBoundingClientRect();
            pointerRef.current.x = e.clientX - rect.left;
            pointerRef.current.y = e.clientY - rect.top;

            for (const dot of dotsRef.current) {
                const dist = Math.hypot(dot.cx - pointerRef.current.x, dot.cy - pointerRef.current.y);
                if (speed > speedTrigger && dist < proximity && !dot._animating) {
                    let rawX = (dot.cx - pointerRef.current.x) * 0.08 + vx * 0.0005;
                    let rawY = (dot.cy - pointerRef.current.y) * 0.08 + vy * 0.0005;
                    const pushX = Math.max(-6, Math.min(6, rawX));
                    const pushY = Math.max(-6, Math.min(6, rawY));
                    springAnimate(dot, pushX, pushY);
                }
            }
        };

        const handleClick = (e) => {
            const rect = canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;

            for (const dot of dotsRef.current) {
                const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
                if (dist < shockRadius && !dot._animating) {
                    const falloff = Math.max(0, 1 - dist / shockRadius);
                    let rawX = (dot.cx - cx) * 0.08 * shockStrength * falloff;
                    let rawY = (dot.cy - cy) * 0.08 * shockStrength * falloff;
                    const pushX = Math.max(-6, Math.min(6, rawX));
                    const pushY = Math.max(-6, Math.min(6, rawY));
                    springAnimate(dot, pushX, pushY);
                }
            }
        };

        const handleMouseLeave = () => {
            pointerRef.current.x = -9999;
            pointerRef.current.y = -9999;
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('click', handleClick);
        window.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (resizeObserver) resizeObserver.disconnect();
            else window.removeEventListener('resize', buildGrid);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('click', handleClick);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [buildGrid, dotSize, proximity, baseColor, activeRgb, baseRgb, maxSpeed, speedTrigger, shockRadius, shockStrength, springAnimate]);

    return (
        <div ref={wrapRef} className={`dot-grid-container ${className}`} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', ...style }}>
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        </div>
    );
}
export default DotGrid;
