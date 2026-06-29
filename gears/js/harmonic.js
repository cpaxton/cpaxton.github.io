import {
    clearBackground,
    createDemoController,
    drawArrow,
    drawLabel,
    formatRatio,
    moduleFromMaxDiameter,
    normalizeHarmonicParams,
} from './gear-math.js';
import { harmonicFlexAngle, harmonicRatio } from './kinematics.js';
import { pitchRadius } from './constraints.js';
import { createWobbleTracker, drawWobbleIndicator } from './overlays.js';
import {
    sampleFlexSpline,
    sampleFlexTeeth,
    sampleCircularSpline,
    harmonicWaveRadii,
} from './profiles/harmonic.js';
import { drawPolylineAt, drawPolyline, drawProfileAt } from './render.js';

const TAU = Math.PI * 2;
const DEFAULTS = { flexTeeth: 30, circularTeeth: 32 };

function drawMeshZones(ctx, cx, cy, ringR, generatorAngle) {
    const zoneHalf = 0.42;
    ctx.save();
    for (const offset of [0, Math.PI]) {
        const center = generatorAngle + offset;
        ctx.fillStyle = 'rgba(93, 255, 154, 0.14)';
        ctx.strokeStyle = 'rgba(93, 255, 154, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR * 0.92, center - zoneHalf, center + zoneHalf);
        ctx.arc(cx, cy, ringR * 0.72, center + zoneHalf, center - zoneHalf, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    ctx.restore();
}

function drawOutputIndicator(ctx, cx, cy, flexAngle) {
    const len = 22;
    const endX = cx + Math.cos(flexAngle) * len;
    const endY = cy + Math.sin(flexAngle) * len;
    drawArrow(ctx, cx, cy, endX, endY, '#ffcc00');
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, TAU);
    ctx.fillStyle = '#ffcc00';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

export function createHarmonicDemo(canvas) {
    let params = normalizeHarmonicParams(DEFAULTS);
    const wobbleTracker = createWobbleTracker();
    let ringCacheKey = '';
    let ringPath = null;

    function ensureRingPath(circularTeeth, module) {
        const key = `${circularTeeth}:${module.toFixed(6)}`;
        if (ringCacheKey !== key) {
            ringCacheKey = key;
            ringPath = sampleCircularSpline(circularTeeth, module);
        }
        return ringPath;
    }

    function getReduction() {
        const { flexTeeth, circularTeeth } = params;
        return harmonicRatio(flexTeeth, circularTeeth);
    }

    function getReductionLabel() {
        const { flexTeeth, circularTeeth } = params;
        return `Reduction: ${formatRatio(getReduction())} · Flex ${flexTeeth}T · Circular ${circularTeeth}T`;
    }

    function drawFrame(ctx, width, height, time) {
        clearBackground(ctx, width, height);

        const { flexTeeth, circularTeeth } = params;
        const cx = width / 2;
        const cy = height / 2;
        const maxRadius = Math.min(width, height) * 0.34;
        const module = moduleFromMaxDiameter(maxRadius * 2, circularTeeth);
        const ringR = pitchRadius(circularTeeth, module);
        const flexR = pitchRadius(flexTeeth, module);
        const generatorAngle = time * 0.6;
        const flexAngle = harmonicFlexAngle(generatorAngle, flexTeeth, circularTeeth);
        const wave = harmonicWaveRadii(flexR, flexTeeth, circularTeeth);

        const ringPathLocal = ensureRingPath(circularTeeth, module);
        drawProfileAt(ctx, cx, cy, 0, ringPathLocal, {
            fill: 'rgba(85, 102, 119, 0.35)',
            stroke: '#556677',
            lineWidth: 2,
            close: true,
        });

        drawMeshZones(ctx, cx, cy, ringR, generatorAngle);

        const flexPath = sampleFlexSpline(flexTeeth, module, generatorAngle, flexAngle);
        drawPolylineAt(ctx, cx, cy, 0, flexPath, {
            fill: 'rgba(74, 144, 217, 0.85)',
            stroke: '#222',
            lineWidth: 1.5,
            close: true,
        });

        const flexTeethLines = sampleFlexTeeth(flexTeeth, module, generatorAngle, flexAngle);
        for (const tooth of flexTeethLines) {
            const worldTooth = tooth.map((p) => ({ x: cx + p.x, y: cy + p.y }));
            drawPolyline(ctx, worldTooth, { stroke: '#111', lineWidth: 1, close: false });
        }

        const { major } = wave;
        const eccentricity = flexR * 0.08;
        const gx = cx + Math.cos(generatorAngle) * eccentricity;
        const gy = cy + Math.sin(generatorAngle) * eccentricity;

        ctx.save();
        ctx.strokeStyle = 'rgba(232, 168, 56, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(generatorAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, major * 0.35, major * 0.22, 0, 0, TAU);
        ctx.fillStyle = '#e8a838';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        drawOutputIndicator(ctx, cx, cy, flexAngle);

        drawLabel(ctx, cx, cy - ringR - 24, '③ Circular spline (fixed ring)', '#aaa', 12);
        drawLabel(ctx, cx, cy + ringR + 32, '② Flex spline (deforms, output)', '#4a90d9', 12);
        drawLabel(ctx, gx + 48, gy - 8, '① Wave generator\n(input)', '#e8a838', 11);
        drawLabel(ctx, cx - 58, cy - 10, '④ Output\n(slow)', '#ffcc00', 10);
        drawLabel(ctx, cx + ringR * 0.55, cy - ringR * 0.35, 'Mesh', '#5dff9a', 10);
        drawLabel(ctx, cx, height - 24, formatRatio(getReduction()), '#ffcc00', 14);

        drawWobbleIndicator(ctx, cx, cy, gx, gy, wobbleTracker, {
            label: 'Input cam wobble',
            color: '#ff6b8a',
        });
    }

    const controller = createDemoController(canvas, drawFrame);

    return {
        ...controller,
        getParams: () => ({ ...params }),
        setParams(updates) {
            params = normalizeHarmonicParams({ ...params, ...updates });
            ringCacheKey = '';
            wobbleTracker.reset();
            controller.redraw();
            return params;
        },
        getReduction,
        getReductionLabel,
    };
}
