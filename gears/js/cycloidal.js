import {
    clearBackground,
    createDemoController,
    drawLabel,
    formatRatio,
    normalizeCycloidalParams,
} from './gear-math.js';
import { cycloidalMotion, cycloidalRatio } from './kinematics.js';
import { createWobbleTracker, drawWobbleIndicator } from './overlays.js';
import {
    cycloidalGeometry,
    fixedPinDiscCenter,
    fixedPinDiscMeshPhase,
    rollingCircleSpin,
    rollingDiscCenter,
    rollingDiscMeshPhase,
    sampleFixedPinDisc,
    sampleHypocycloidInRollingFrame,
    samplePinPositions,
} from './profiles/trochoid.js';
import { drawCircle, drawPolylineAt } from './render.js';

const TAU = Math.PI * 2;
const DEFAULTS = { lobes: 5, pins: 6, variant: 'fixed-pin', counterDisc: false };

function drawDashedCircle(ctx, x, y, radius, color, label) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    if (label) {
        drawLabel(ctx, x + radius + 12, y, label, color, 11);
    }
}

function drawDisc(ctx, x, y, angle, path, fill, stroke = '#222') {
    drawPolylineAt(ctx, x, y, angle, path, {
        fill,
        stroke,
        lineWidth: 1.5,
        close: true,
    });
}

function drawFixedPinDisc(ctx, cx, cy, geom, params, motion, phaseOffset, style, discPath) {
    const { fixedPinEccentricity, pinRingRadius } = geom;
    const orbit = motion.orbitAngle + phaseOffset;
    const discCenter = fixedPinDiscCenter(orbit, fixedPinEccentricity);
    const discAngle = motion.discSpin + fixedPinDiscMeshPhase(pinRingRadius, fixedPinEccentricity);
    drawDisc(
        ctx,
        cx + discCenter.x,
        cy + discCenter.y,
        discAngle,
        discPath,
        style.fill,
        style.stroke
    );
    return discCenter;
}

function drawRollingDisc(ctx, cx, cy, geom, params, motion, phaseOffset, style, discPath) {
    const { lobes } = params;
    const { pinRingRadius, rollingRadius, hypocycloidOrbit } = geom;
    const orbit = motion.orbitAngle + phaseOffset;
    const discCenter = rollingDiscCenter(orbit, hypocycloidOrbit);
    const rollSpin = rollingCircleSpin(orbit, lobes);
    const discAngle = rollSpin + motion.discSpin + rollingDiscMeshPhase();

    const rcx = cx + discCenter.x;
    const rcy = cy + discCenter.y;

    if (style.drawRollingCircle) {
        ctx.save();
        ctx.translate(rcx, rcy);
        ctx.rotate(rollSpin);
        ctx.strokeStyle = style.orbitColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, rollingRadius, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    drawDisc(ctx, rcx, rcy, discAngle, discPath, style.fill, style.stroke);
    return discCenter;
}

function drawFixedPinMode(ctx, cx, cy, geom, params, motion, paths) {
    const { fixedPinEccentricity, pinRingRadius } = geom;

    drawDashedCircle(ctx, cx, cy, pinRingRadius, '#666', null);
    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, pinRingRadius, 0, TAU);
    ctx.stroke();
    ctx.restore();

    let center1 = { x: 0, y: 0 };
    let center2 = { x: 0, y: 0 };

    if (params.counterDisc) {
        center2 = drawFixedPinDisc(ctx, cx, cy, geom, params, motion, Math.PI, {
            fill: 'rgba(155, 89, 182, 0.55)',
            stroke: '#5a3d6e',
        }, paths.fixedPin);
    }

    center1 = drawFixedPinDisc(ctx, cx, cy, geom, params, motion, 0, {
        fill: '#4a90d9',
        stroke: '#222',
    }, paths.fixedPin);

    for (const pin of paths.pins) {
        drawCircle(ctx, cx + pin.x, cy + pin.y, geom.pinRadius, {
            fill: '#8899aa',
            stroke: '#333',
            lineWidth: 1,
        });
    }

    drawDashedCircle(ctx, cx, cy, fixedPinEccentricity, '#e8a838', 'Eccentric orbit');
    drawLabel(ctx, cx, cy - pinRingRadius - 24, 'Fixed pins (housing)', '#aaa', 12);
    drawLabel(ctx, cx, cy + pinRingRadius + 28, 'Lobed cycloidal disc', '#4a90d9', 12);
    if (params.counterDisc) {
        drawLabel(ctx, cx - pinRingRadius - 52, cy + 36, 'Counter disc\n(180°)', '#b87fd4', 10);
    }

    return params.counterDisc
        ? { x: (center1.x + center2.x) / 2, y: (center1.y + center2.y) / 2 }
        : center1;
}

function drawRollingMode(ctx, cx, cy, geom, params, motion, paths) {
    const { pinRingRadius, hypocycloidOrbit } = geom;

    drawDashedCircle(ctx, cx, cy, pinRingRadius, '#666', null);
    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, pinRingRadius, 0, TAU);
    ctx.stroke();
    ctx.restore();

    for (const pin of paths.pins) {
        drawCircle(ctx, cx + pin.x, cy + pin.y, geom.pinRadius * 0.55, {
            fill: 'rgba(136,153,170,0.35)',
            stroke: 'rgba(100,100,100,0.6)',
            lineWidth: 1,
        });
    }

    let center1 = { x: 0, y: 0 };
    let center2 = { x: 0, y: 0 };

    if (params.counterDisc) {
        center2 = drawRollingDisc(ctx, cx, cy, geom, params, motion, Math.PI, {
            fill: 'rgba(155, 89, 182, 0.5)',
            stroke: '#5a3d6e',
            drawRollingCircle: true,
            orbitColor: 'rgba(155, 89, 182, 0.7)',
        }, paths.rolling);
    }

    center1 = drawRollingDisc(ctx, cx, cy, geom, params, motion, 0, {
        fill: 'rgba(74,144,217,0.92)',
        stroke: '#222',
        drawRollingCircle: !params.counterDisc,
        orbitColor: 'rgba(232,168,56,0.85)',
    }, paths.rolling);

    if (!params.counterDisc) {
        const discCenter = rollingDiscCenter(motion.orbitAngle, hypocycloidOrbit);
        const rcx = cx + discCenter.x;
        const rcy = cy + discCenter.y;
        drawDashedCircle(ctx, rcx, rcy, geom.rollingRadius, '#e8a838', null);
    }

    drawDashedCircle(ctx, cx, cy, hypocycloidOrbit, '#e8a838', 'Rolling orbit');
    drawLabel(ctx, cx, cy - pinRingRadius - 24, 'Rolling circle inside pitch', '#e8a838', 12);
    drawLabel(ctx, cx, cy + pinRingRadius + 28, 'Hypocycloid disc profile', '#4a90d9', 12);
    if (params.counterDisc) {
        drawLabel(ctx, cx - pinRingRadius - 52, cy + 36, 'Counter disc\n(180°)', '#b87fd4', 10);
    } else {
        drawLabel(ctx, cx - pinRingRadius - 58, cy, 'Pins shown\ndashed (fixed\nreference)', '#888', 10);
    }

    return params.counterDisc
        ? { x: (center1.x + center2.x) / 2, y: (center1.y + center2.y) / 2 }
        : center1;
}

function drawOutputArm(ctx, x, y, outputAngle, armLen, color = '#ffcc00') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(outputAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(armLen, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(armLen, 0, 5, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

function drawEccentricGhostArm(ctx, cx, cy, discCenter, outputAngle, armLen) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    drawOutputArm(
        ctx,
        cx + discCenter.x,
        cy + discCenter.y,
        outputAngle,
        armLen,
        '#ff9966'
    );
    ctx.restore();
}

export function createCycloidalDemo(canvas) {
    let params = normalizeCycloidalParams(DEFAULTS);
    const wobbleTracker = createWobbleTracker();
    let pathCacheKey = '';
    let pathCache = null;

    function ensurePaths(geom) {
        const key = `${params.variant}:${params.lobes}:${params.pins}:${geom.discRadius}:${geom.rollingRadius}:${geom.pinRingRadius}`;
        if (pathCacheKey !== key) {
            pathCacheKey = key;
            pathCache = {
                fixedPin: sampleFixedPinDisc(geom.discRadius, params.lobes, geom.rollingRadius),
                rolling: sampleHypocycloidInRollingFrame(geom.pinRingRadius, params.lobes),
                pins: samplePinPositions(params.pins, geom.pinRingRadius),
            };
        }
        return pathCache;
    }

    function getReduction() {
        const { lobes, pins } = params;
        return cycloidalRatio(pins, lobes);
    }

    function getReductionLabel() {
        const { lobes, pins, variant, counterDisc } = params;
        const mode = variant === 'rolling' ? 'Rolling trochoid' : 'Fixed pins';
        const balance = counterDisc ? ' · Counter disc on' : '';
        return `${mode}${balance} · ${formatRatio(getReduction())} · ${lobes} lobes · ${pins} pins`;
    }

    function drawFrame(ctx, width, height, time) {
        clearBackground(ctx, width, height);

        const pinRingRadius = Math.min(width, height) * 0.32;
        const geom = cycloidalGeometry(params.pins, params.lobes, pinRingRadius);
        const paths = ensurePaths(geom);
        const inputAngle = time * 1.2;
        const motion = cycloidalMotion(inputAngle, params.pins, params.lobes);
        const cx = width / 2;
        const cy = height / 2;
        const armLen = geom.discRadius * 0.4;

        const imbalance = params.variant === 'rolling'
            ? drawRollingMode(ctx, cx, cy, geom, params, motion, paths)
            : drawFixedPinMode(ctx, cx, cy, geom, params, motion, paths);

        if (params.counterDisc) {
            drawEccentricGhostArm(ctx, cx, cy, imbalance, motion.outputAngle, armLen);
            drawOutputArm(ctx, cx, cy, motion.outputAngle, armLen);
            drawLabel(ctx, cx + armLen + 18, cy - 6, 'Output (on-axis)', '#ffcc00', 11);
        } else {
            drawOutputArm(
                ctx,
                cx + imbalance.x,
                cy + imbalance.y,
                motion.outputAngle,
                armLen,
                '#ff9966'
            );
            drawLabel(ctx, cx + imbalance.x + armLen + 14, cy + imbalance.y - 6, 'Output orbits', '#ff9966', 11);
        }

        drawWobbleIndicator(
            ctx,
            cx,
            cy,
            cx + imbalance.x,
            cy + imbalance.y,
            wobbleTracker,
            {
                label: params.counterDisc ? 'Net housing shake' : 'Eccentric disc shake',
                color: params.counterDisc ? '#9b59b6' : '#ff6b8a',
            }
        );

        drawLabel(ctx, cx, height - 24, formatRatio(getReduction()), '#ffcc00', 14);
    }

    const controller = createDemoController(canvas, drawFrame);

    return {
        ...controller,
        getParams: () => ({ ...params }),
        setParams(updates) {
            params = normalizeCycloidalParams({ ...params, ...updates });
            pathCacheKey = '';
            wobbleTracker.reset();
            controller.redraw();
            return params;
        },
        getReduction,
        getReductionLabel,
    };
}
