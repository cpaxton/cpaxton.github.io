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
    rollingCircleSpin,
    rollingDiscCenter,
    rollingDiscMeshPhase,
    sampleEquidistantCycloidalDisc,
    sampleHypocycloidInRollingFrame,
    samplePinPositions,
} from './profiles/trochoid.js';
import { measureCycloidalPinContact, solveCycloidalMeshPhase } from './mesh-solver.js';
import { drawContactOverlay, formatContactReadout } from './contact-overlay.js';
import { isCycloidalPinClearanceOk } from './constraints.js';
import { cycloidalMassShake } from './cycloidal-shake.js';
import { estimateCycloidal, estimateLabel } from './estimates.js';
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

function fixedPinDiscPose(geom, params, motion, meshPhase, phaseOffset = 0) {
    const orbit = motion.orbitAngle + phaseOffset;
    const center = fixedPinDiscCenter(orbit, geom.fixedPinEccentricity);
    const angle = motion.fixedPinDiscAngle + meshPhase + phaseOffset;
    return { center, angle };
}

function drawFixedPinDisc(ctx, cx, cy, geom, params, motion, meshPhase, phaseOffset, style, discPath) {
    const { center: discCenter, angle: discAngle } = fixedPinDiscPose(
        geom, params, motion, meshPhase, phaseOffset
    );
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

/** Counter disc shares orbit +π; rollSpin already picks up π·(L−1), so only odd L need +π on angle. */
function counterDiscAngleOffset(phaseOffset, lobes) {
    if (phaseOffset === 0) return 0;
    return lobes % 2 === 0 ? 0 : phaseOffset;
}

function drawRollingDisc(ctx, cx, cy, geom, params, motion, phaseOffset, style, discPath) {
    const { lobes } = params;
    const { pinRingRadius, rollingRadius, hypocycloidOrbit } = geom;
    const orbit = motion.orbitAngle + phaseOffset;
    const discCenter = rollingDiscCenter(orbit, hypocycloidOrbit);
    const rollSpin = rollingCircleSpin(orbit, lobes);
    const discAngle =
        rollSpin
        + rollingDiscMeshPhase()
        + counterDiscAngleOffset(phaseOffset, lobes);

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

    for (const pin of paths.pins) {
        drawCircle(ctx, cx + pin.x, cy + pin.y, geom.pinRadius, {
            fill: '#8899aa',
            stroke: '#333',
            lineWidth: 1,
        });
    }

    if (params.counterDisc) {
        drawFixedPinDisc(ctx, cx, cy, geom, params, motion, paths.meshPhase, Math.PI, {
            fill: 'rgba(155, 89, 182, 0.55)',
            stroke: '#5a3d6e',
        }, paths.fixedPin);
    }

    drawFixedPinDisc(ctx, cx, cy, geom, params, motion, paths.meshPhase, 0, {
        fill: '#4a90d9',
        stroke: '#222',
    }, paths.fixedPin);

    drawDashedCircle(ctx, cx, cy, fixedPinEccentricity, '#e8a838', 'Eccentric orbit');
    drawLabel(ctx, cx, cy - pinRingRadius - 24, 'Fixed pins (housing)', '#aaa', 12);
    drawLabel(ctx, cx, cy + pinRingRadius + 28, 'Lobed cycloidal disc', '#4a90d9', 12);
    if (params.counterDisc) {
        drawLabel(ctx, cx - pinRingRadius - 52, cy + 36, 'Counter disc\n(180°)', '#b87fd4', 10);
    }
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

    drawRollingDisc(ctx, cx, cy, geom, params, motion, 0, {
        fill: 'rgba(74,144,217,0.92)',
        stroke: '#222',
        drawRollingCircle: !params.counterDisc,
        orbitColor: 'rgba(232,168,56,0.85)',
    }, paths.rolling);

    if (params.counterDisc) {
        drawRollingDisc(ctx, cx, cy, geom, params, motion, Math.PI, {
            fill: 'rgba(155, 89, 182, 0.5)',
            stroke: '#5a3d6e',
            drawRollingCircle: true,
            orbitColor: 'rgba(155, 89, 182, 0.7)',
        }, paths.rolling);
    }

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
    let lastContact = null;
    let lastScale = 1;

    function ensurePaths(geom) {
        const key = `${params.variant}:${params.lobes}:${params.pins}:${geom.discRadius}:${geom.fixedPinEccentricity}:${geom.pinRingRadius}:${geom.pinRadius}`;
        if (pathCacheKey !== key) {
            pathCacheKey = key;
            const fixedPin = sampleEquidistantCycloidalDisc(
                geom.pinRingRadius,
                geom.fixedPinEccentricity,
                params.pins,
                geom.pinRadius,
                360
            );
            pathCache = {
                fixedPin,
                rolling: sampleHypocycloidInRollingFrame(geom.pinRingRadius, params.lobes),
                pins: samplePinPositions(params.pins, geom.pinRingRadius),
                meshPhase: solveCycloidalMeshPhase({
                    discProfile: fixedPin,
                    pins: params.pins,
                    lobes: params.lobes,
                    pinRingRadius: geom.pinRingRadius,
                    eccentricity: geom.fixedPinEccentricity,
                    pinRadius: geom.pinRadius,
                }),
            };
        }
        return pathCache;
    }

    function getContactInfo() {
        if (!lastContact?.engaged) return null;
        return {
            contact: lastContact,
            readout: formatContactReadout(lastContact, lastScale, {
                isClearanceOk: isCycloidalPinClearanceOk,
            }),
        };
    }

    function getReduction() {
        const { lobes, pins } = params;
        return cycloidalRatio(pins, lobes);
    }

    function getReductionLabel() {
        const { lobes, pins, variant, counterDisc } = params;
        const mode = variant === 'rolling' ? 'Rolling trochoid (curve)' : 'Fixed pins';
        const balance = counterDisc ? ' · Counter disc on' : '';
        const est = estimateLabel(estimateCycloidal({ lobes, pins, counterDisc }));
        return `${mode}${balance} · ${formatRatio(getReduction())} · ${lobes} lobes · ${pins} pins · ${est}`;
    }

    function drawFrame(ctx, width, height, time, meta = {}) {
        clearBackground(ctx, width, height);

        const pinRingRadius = Math.min(width, height) * 0.32;
        const geom = cycloidalGeometry(params.pins, params.lobes, pinRingRadius);
        lastScale = geom.pinRadius;
        const paths = ensurePaths(geom);
        const inputAngle = time * 1.2;
        const motion = cycloidalMotion(inputAngle, params.pins, params.lobes);
        const cx = width / 2;
        const cy = height / 2;
        const armLen = geom.discRadius * 0.4;

        if (params.variant === 'rolling') {
            drawRollingMode(ctx, cx, cy, geom, params, motion, paths);
        } else {
            drawFixedPinMode(ctx, cx, cy, geom, params, motion, paths);
        }

        const discProfile = params.variant === 'rolling' ? paths.rolling : paths.fixedPin;
        const shake = cycloidalMassShake({
            profile: discProfile,
            meshPhase: paths.meshPhase,
            motion,
            geom,
            lobes: params.lobes,
            counterDisc: params.counterDisc,
            variant: params.variant,
        });

        if (params.variant === 'fixed-pin') {
            const { center, angle } = fixedPinDiscPose(geom, params, motion, paths.meshPhase, 0);
            if (meta.forceRefine || meta.frame % 3 === 0 || !lastContact) {
                lastContact = measureCycloidalPinContact({
                    discProfile: paths.fixedPin,
                    discX: cx + center.x,
                    discY: cy + center.y,
                    discAngle: angle,
                    housingX: cx,
                    housingY: cy,
                    pins: paths.pins,
                    pinRadius: geom.pinRadius,
                });
            }
            drawContactOverlay(ctx, lastContact, geom.pinRadius, {
                isClearanceOk: isCycloidalPinClearanceOk,
            });
        } else {
            lastContact = null;
        }

        if (params.counterDisc) {
            drawEccentricGhostArm(ctx, cx, cy, shake.primaryCenter, motion.outputAngle, armLen);
            drawOutputArm(ctx, cx, cy, motion.outputAngle, armLen);
            drawLabel(ctx, cx + armLen + 18, cy - 6, 'Output (on-axis)', '#ffcc00', 11);
        } else {
            drawOutputArm(
                ctx,
                cx + shake.primaryCenter.x,
                cy + shake.primaryCenter.y,
                motion.outputAngle,
                armLen,
                '#ff9966'
            );
            drawLabel(
                ctx,
                cx + shake.primaryCenter.x + armLen + 14,
                cy + shake.primaryCenter.y - 6,
                'Output orbits',
                '#ff9966',
                11
            );
        }

        const wobbleMag = Math.hypot(shake.wobble.x, shake.wobble.y);
        drawWobbleIndicator(
            ctx,
            cx,
            cy,
            cx + shake.wobble.x,
            cy + shake.wobble.y,
            wobbleTracker,
            {
                label: params.counterDisc
                    ? (wobbleMag < 1 ? 'Net housing shake (balanced)' : 'Net housing shake')
                    : 'Eccentric disc shake',
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
        getContactInfo,
    };
}
