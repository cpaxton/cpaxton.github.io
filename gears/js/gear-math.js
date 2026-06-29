/**
 * Shared canvas utilities and re-exports for gear explainer demos.
 */

export { clamp, formatRatio, pitchRadius, centerDistance, moduleFromMaxDiameter,
    planetaryRingTeeth, computePlanetaryRing, DEFAULT_PRESSURE_ANGLE,
    normalizeSpurParams, normalizePlanetaryParams, normalizeCycloidalParams,
    normalizeHarmonicParams, normalizeWormParams,
} from './constraints.js';

export {
    spurDrivenAngle,
    spurDrivenOmega,
    meshDrivenAngle,
    meshAngularVelocity,
    planetaryCarrierAngle,
    planetaryPlanetAngle,
    planetaryPlanetAngleFromCounts,
    meshPlanetAngle,
    wormWheelAngle,
    cycloidalRatio,
    cycloidalMotion,
    cycloidalOutputAngle,
    harmonicFlexAngle,
    harmonicRatio,
    computeMeshPhase,
    gapPhaseForContact,
} from './kinematics-bridge.js';

export {
    drawProfileAt,
    drawInvoluteGear,
    drawPitchCircle,
    drawGearLabel,
    drawPolylineAt,
    drawCircle,
    transformPoints,
} from './render.js';

export { sampleExternalGear, sampleInternalGear, spurMeshAngles, externalMeshPhase, internalMeshPhase } from './profiles/involute.js';

const TAU = Math.PI * 2;

/** @deprecated Use spurDrivenAngle from kinematics */
export function meshDrivenAngleLegacy(driverAngle, driverTeeth, drivenTeeth) {
    const ratio = driverTeeth / drivenTeeth;
    const gapIndex = Math.floor(drivenTeeth / 2);
    const gapCenter = ((gapIndex + 0.5) / drivenTeeth) * TAU;
    return -ratio * driverAngle + (Math.PI - gapCenter);
}

export function setupCanvas(canvas, aspectRatio = 16 / 10) {
    const wrap = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const width = wrap.clientWidth || 800;
    const height = Math.round(width / aspectRatio);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height, dpr };
}

export function drawLabel(ctx, x, y, text, color = '#fff', fontSize = 13) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
}

export function drawArrow(ctx, x1, y1, x2, y2, color = '#ffcc00') {
    const headLen = 8;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4));
    ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

export function clearBackground(ctx, width, height, color = '#1a1a2e') {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
}

export function createDemoController(canvas, drawFrame, aspectRatio = 16 / 10) {
    let playing = false;
    let wantPlaying = true;
    let inView = true;
    let speed = 0.2;
    let time = 0;
    let frame = 0;
    let rafId = null;
    let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let canvasState = setupCanvas(canvas, aspectRatio);

    function drawMeta(forceRefine = false) {
        frame += 1;
        drawFrame(canvasState.ctx, canvasState.width, canvasState.height, time, {
            frame,
            forceRefine,
        });
    }

    function resize() {
        canvasState = setupCanvas(canvas, aspectRatio);
        if (!playing || reducedMotion) {
            drawMeta(false);
        }
    }

    function loop() {
        if (!playing) return;
        time += 0.016 * speed;
        drawMeta(false);
        rafId = requestAnimationFrame(loop);
    }

    function syncLoop() {
        if (reducedMotion) return;
        const shouldRun = wantPlaying && inView;
        if (shouldRun && !playing) {
            playing = true;
            if (rafId) cancelAnimationFrame(rafId);
            loop();
        } else if (!shouldRun && playing) {
            playing = false;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }
    }

    function start() {
        if (reducedMotion) {
            drawFrame(canvasState.ctx, canvasState.width, canvasState.height, 0, { frame: 0, forceRefine: false });
            return;
        }
        wantPlaying = true;
        syncLoop();
    }

    function stop() {
        wantPlaying = false;
        playing = false;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function setSpeed(s) {
        speed = s;
    }

    function isPlaying() {
        return playing;
    }

    function getTime() {
        return time;
    }

    function step(delta = 0.08) {
        time += delta;
        drawMeta(true);
        return time;
    }

    window.addEventListener('resize', resize);

    if (typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver(
            (entries) => {
                inView = entries.some((entry) => entry.isIntersecting);
                syncLoop();
            },
            { rootMargin: '80px', threshold: 0 }
        );
        observer.observe(canvas);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            playing = false;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        } else {
            syncLoop();
        }
    });

    function redraw() {
        drawMeta(false);
    }

    drawFrame(canvasState.ctx, canvasState.width, canvasState.height, 0, { frame: 0, forceRefine: false });
    if (!reducedMotion) {
        wantPlaying = true;
        syncLoop();
    }

    return { start, stop, setSpeed, isPlaying, resize, redraw, step, getTime };
}
