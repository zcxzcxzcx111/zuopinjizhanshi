/* ==========================================================================
   周呈祥 (Zhou Chengxiang) - Portfolio Interactive Logic & React Bits DotField Engine
   ========================================================================== */

// 1. Copy to Clipboard & Toast
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`成功复制: ${text}`);
    }).catch(err => {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast(`成功复制: ${text}`);
    });
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 2. Refresh 1:1 Iframe Container
function refreshFrame(iframeId) {
    const iframe = document.getElementById(iframeId);
    if (iframe) {
        setFrameLoading(iframe, '正在重新加载项目…');
        iframe.src = iframe.src;
        showToast(`已重新加载 1:1 原版工程页面！`);
    }
}

function setFrameLoading(iframe, message) {
    const status = iframe.parentElement?.querySelector('.iframe-loading');
    if (!status) return;
    status.classList.remove('is-hidden');
    status.querySelector('span').textContent = message;
}

// Embedded apps can report their content height after asynchronous searches.
// This avoids treating the iframe's own viewport as page content, which leaves
// a large blank tail after new results are rendered.
window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.type !== 'embedded:content-height') return;

    const iframeId = data.iframeId === 'iframe-wechat' ? 'iframe-wechat' : 'iframe-bd';
    const iframe = document.getElementById(iframeId);
    if (!iframe || event.source !== iframe.contentWindow) return;

    const height = Number(data.height);
    if (!Number.isFinite(height)) return;
    iframe.style.height = `${Math.min(5200, Math.max(720, Math.ceil(height)))}px`;
});

function watchProjectFrame(iframe) {
    const status = iframe.parentElement?.querySelector('.iframe-loading');
    if (!status) return;

    const timeout = window.setTimeout(() => {
        status.querySelector('span').textContent = '项目未能及时加载，请检查服务后重试。';
    }, 8000);

    iframe.addEventListener('load', () => {
        window.clearTimeout(timeout);
        status.classList.add('is-hidden');
    }, { once: true });

    iframe.addEventListener('error', () => {
        window.clearTimeout(timeout);
        status.querySelector('span').textContent = '项目加载失败，请检查服务后重试。';
    }, { once: true });
}

// Match each embedded project to its actual document height so it never
// creates a second vertical scrollbar or leaves a large empty tail.
function fitProjectFrame(iframe) {
    if (!iframe) return;

    // This interactive tool uses a two-column application shell. Its document
    // height mirrors the host iframe viewport, so measuring it creates a resize
    // feedback loop and a large blank tail. Keep the curated portfolio viewport
    // compact instead.
    if (iframe.id === 'iframe-video' || iframe.id === 'iframe-memory') return;

    const resize = () => {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const root = doc.documentElement;
        const body = doc.body;
        let contentHeight = Math.max(root?.scrollHeight || 0, body?.scrollHeight || 0);
        const footer = doc.querySelector('footer');
        if (iframe.id === 'iframe-bd' && footer) {
            contentHeight = footer.offsetTop + footer.offsetHeight + 1;
        }
        const height = contentHeight;
        if (height > 0) iframe.style.height = `${height}px`;
    };

    iframe.addEventListener('load', () => {
        resize();
        const body = iframe.contentDocument?.body;
        if (body && 'ResizeObserver' in window) {
            new ResizeObserver(resize).observe(body);
        }
    });
}

// ==========================================================================
// 3. Initialize DotGrid background engine (loaded from components/DotGrid.js)
// ==========================================================================

// The portrait cover and the portfolio share one document. Keeping both in
// normal flow makes the transition reversible with native scrolling while a
// lightweight progress value drives the cover's visual motion.
function initPortraitTransition() {
    const intro = document.getElementById('portrait-intro');
    if (!intro) return;

    function smoothstep(start, end, value) {
        const normalized = Math.min(1, Math.max(0, (value - start) / Math.max(0.0001, end - start)));
        return normalized * normalized * (3 - 2 * normalized);
    }

    let queued = false;
    const draw = () => {
        const travel = Math.max(1, intro.offsetHeight - window.innerHeight);
        const progress = Math.min(1, Math.max(0, -intro.getBoundingClientRect().top / travel));
        const easedProgress = smoothstep(0, 1, progress);
        const handoffProgress = smoothstep(0.18, 0.88, progress);
        const lightProgress = smoothstep(0.18, 0.9, progress);
        const copyExitProgress = smoothstep(0.12, 0.7, progress);
        document.documentElement.style.setProperty('--portrait-progress', progress.toFixed(4));
        document.documentElement.style.setProperty('--portrait-eased-progress', easedProgress.toFixed(4));
        document.documentElement.style.setProperty('--handoff-progress', handoffProgress.toFixed(4));
        document.documentElement.style.setProperty('--handoff-offset', `${((1 - handoffProgress) * 72).toFixed(2)}px`);
        document.documentElement.style.setProperty('--portrait-light-progress', lightProgress.toFixed(4));
        document.documentElement.style.setProperty('--portrait-light-scale', (0.82 + lightProgress * 0.18).toFixed(4));
        document.documentElement.style.setProperty('--portrait-copy-opacity', (1 - copyExitProgress).toFixed(4));
        document.documentElement.style.setProperty('--portrait-copy-offset', `${(-copyExitProgress * 32).toFixed(2)}px`);
        intro.toggleAttribute('data-exiting', progress > 0.02);
        dispatchEvent(new CustomEvent('portraitprogress', {
            detail: { progress, easedProgress, handoffProgress, lightProgress }
        }));
        queued = false;
    };

    const queueDraw = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(draw);
    };

    addEventListener('scroll', queueDraw, { passive: true });
    addEventListener('resize', queueDraw, { passive: true });
    draw();
}

function initPortraitParticles() {
    const intro = document.getElementById('portrait-intro');
    const stage = intro?.querySelector('.portrait-intro__stage');
    const figure = intro?.querySelector('.portrait-intro__figure');
    const canvas = intro?.querySelector('.portrait-intro__particles');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    if (!intro || !stage || !figure || !canvas || reducedMotion.matches) return;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const MAX_DESKTOP_PARTICLES = 14000;
    const MAX_MOBILE_PARTICLES = 5000;
    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const hash = (x, y, salt = 0) => {
        const value = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
        return value - Math.floor(value);
    };
    const quadraticPoint = (start, control, end, amount) => {
        const inverse = 1 - amount;
        return inverse * inverse * start + 2 * inverse * amount * control + amount * amount * end;
    };
    const particleColor = (tone) => {
        if (tone > 0.95) return '#f4eaff';
        if (tone > 0.8) return '#9766ef';
        return '#111a35';
    };

    let particles = [];
    let currentProgress = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--portrait-eased-progress')) || 0;
    let lastRenderedProgress = -1;
    let ready = false;
    let resizeTimer = 0;

    function renderPortraitParticles(progress = currentProgress) {
        currentProgress = clamp(progress);
        if (!ready || Math.abs(currentProgress - lastRenderedProgress) < 0.0008) return;
        lastRenderedProgress = currentProgress;

        const width = stage.clientWidth;
        const height = stage.clientHeight;
        context.clearRect(0, 0, width, height);

        const dissolve = clamp((currentProgress - 0.08) / 0.72);
        if (dissolve <= 0) {
            figure.style.opacity = '1';
            return;
        }

        figure.style.opacity = String(1 - clamp((dissolve - 0.12) / 0.62));

        for (const particle of particles) {
            const local = clamp((dissolve - particle.delay) / Math.max(0.001, 1 - particle.delay));
            const routeProgress = local * local * (3 - 2 * local);
            const absorption = clamp((local - 0.58) / 0.42);
            const terminalFadeProgress = clamp((local - 0.78) / 0.16);
            const terminalFade = 1 - terminalFadeProgress * terminalFadeProgress * (3 - 2 * terminalFadeProgress);
            const alpha = Math.pow(1 - local, 0.92) * Math.min(1, 0.42 + dissolve * 2.7) * terminalFade;
            if (alpha <= 0.015) continue;

            const turbulence = Math.sin(local * Math.PI * 2 + particle.phase) * particle.wave * (1 - absorption);
            const x = quadraticPoint(particle.x, particle.controlX, particle.targetX, routeProgress) + turbulence;
            const y = quadraticPoint(particle.y, particle.controlY, particle.targetY, routeProgress);
            const size = Math.max(0.45, particle.size * (1 + absorption * 1.8));

            context.globalAlpha = alpha;
            context.fillStyle = particleColor(particle.tone);
            context.fillRect(x, y, size, size);
        }

        context.globalAlpha = 1;
    }

    async function buildPortraitParticles() {
        try {
            if (!figure.complete || !figure.naturalWidth) await figure.decode();

            const width = Math.max(1, stage.clientWidth);
            const height = Math.max(1, stage.clientHeight);
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            context.setTransform(dpr, 0, 0, dpr, 0, 0);

            const source = document.createElement('canvas');
            source.width = width;
            source.height = height;
            const sourceContext = source.getContext('2d', { willReadFrequently: true });
            if (!sourceContext) throw new Error('Canvas sampling context unavailable');

            sourceContext.drawImage(
                figure,
                figure.offsetLeft,
                figure.offsetTop,
                figure.offsetWidth,
                figure.offsetHeight
            );

            const pixels = sourceContext.getImageData(0, 0, width, height).data;
            const isMobile = width <= 860;
            const step = isMobile ? 7 : 5;
            const maxParticles = isMobile ? MAX_MOBILE_PARTICLES : MAX_DESKTOP_PARTICLES;
            const sampled = [];
            const alphaAt = (x, y) => {
                if (x < 0 || y < 0 || x >= width || y >= height) return 0;
                return pixels[(Math.floor(y) * width + Math.floor(x)) * 4 + 3];
            };

            for (let y = Math.floor(step / 2); y < height; y += step) {
                for (let x = Math.floor(step / 2); x < width; x += step) {
                    const index = (y * width + x) * 4;
                    if (pixels[index + 3] < 32) continue;

                    const edge = alphaAt(x - step, y) < 32 || alphaAt(x + step, y) < 32 ||
                        alphaAt(x, y - step) < 32 || alphaAt(x, y + step) < 32;
                    const targetX = width * (0.05 + hash(x, y, 10) * 0.22);
                    const targetY = height * (0.1 + hash(x, y, 11) * 0.26);
                    sampled.push({
                        x,
                        y,
                        targetX: targetX,
                        targetY: targetY,
                        controlX: Math.min(x - 24, (x + targetX) * 0.5 - width * 0.08),
                        controlY: y + (targetY - y) * 0.36 + (hash(x, y, 12) - 0.5) * 70,
                        wave: 3 + hash(x, y, 4) * 15,
                        phase: hash(x, y, 5) * Math.PI * 2,
                        size: 1 + hash(x, y, 6) * 2,
                        delay: edge ? hash(x, y, 7) * 0.12 : 0.18 + hash(x, y, 8) * 0.42,
                        tone: hash(x, y, 9)
                    });
                }
            }

            const stride = Math.max(1, Math.ceil(sampled.length / maxParticles));
            particles = sampled.filter((_, index) => index % stride === 0).slice(0, maxParticles);
            ready = particles.length > 0;
            intro.classList.toggle('is-particle-ready', ready);
            lastRenderedProgress = -1;
            renderPortraitParticles(currentProgress);
        } catch (error) {
            ready = false;
            particles = [];
            intro.classList.remove('is-particle-ready');
            figure.style.removeProperty('opacity');
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    addEventListener('portraitprogress', (event) => renderPortraitParticles(event.detail.easedProgress));
    addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(buildPortraitParticles, 180);
    }, { passive: true });
    reducedMotion.addEventListener?.('change', () => window.location.reload());
    buildPortraitParticles();
}

// The standalone visual prototype can host this page in an iframe. In that
// mode the production cover is hidden and an upward gesture at the very top
// is forwarded to the prototype, including across different local ports.
function initEmbeddedPrototypeBridge() {
    const isEmbedded = window.parent !== window && new URLSearchParams(window.location.search).has('embedded');
    if (!isEmbedded) return;

    document.body.classList.add('embedded-portfolio');
    const TOP_EDGE_PX = 8;
    const RETURN_INTENT_THRESHOLD = 24;
    let upwardIntent = 0;
    let touchStartY = null;

    const forwardReturnIntent = (deltaY) => {
        document.body.dataset.prototypeWheel = String(Math.round(deltaY));
        document.body.dataset.embeddedScroll = String(Math.round(window.scrollY));
        if (window.scrollY > TOP_EDGE_PX || deltaY >= 0) {
            upwardIntent = 0;
            return;
        }
        upwardIntent += Math.abs(deltaY);
        if (upwardIntent < RETURN_INTENT_THRESHOLD) return;
        upwardIntent = 0;
        document.body.dataset.prototypeReturn = 'true';
        window.parent.postMessage({ type: 'portrait-prototype-return' }, '*');
    };

    addEventListener('wheel', (event) => forwardReturnIntent(event.deltaY), { passive: true });
    addEventListener('scroll', () => {
        document.body.dataset.embeddedScroll = String(Math.round(window.scrollY));
        if (window.scrollY > TOP_EDGE_PX) upwardIntent = 0;
    }, { passive: true });
    addEventListener('touchstart', (event) => {
        touchStartY = event.touches[0]?.clientY ?? null;
    }, { passive: true });
    addEventListener('touchmove', (event) => {
        const currentY = event.touches[0]?.clientY;
        if (touchStartY === null || currentY === undefined) return;
        forwardReturnIntent(touchStartY - currentY);
        touchStartY = currentY;
    }, { passive: true });
}

initEmbeddedPrototypeBridge();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initPortraitTransition();
    initPortraitParticles();
    // DotGrid auto-inits via its own IIFE
    document.querySelectorAll('.live-project-iframe').forEach((iframe) => {
        watchProjectFrame(iframe);
        fitProjectFrame(iframe);
    });

    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const closeMenu = document.querySelector('.mobile-menu-close');
    const setMenu = (isOpen) => {
        mobileMenu?.classList.toggle('is-open', isOpen);
        mobileMenu?.setAttribute('aria-hidden', String(!isOpen));
        menuToggle?.setAttribute('aria-expanded', String(isOpen));
        document.body.classList.toggle('menu-open', isOpen);
    };
    menuToggle?.addEventListener('click', () => setMenu(true));
    closeMenu?.addEventListener('click', () => setMenu(false));
    mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
});
