import {
    clearBackground,
    createDemoController,
    drawLabel,
    formatRatio,
    normalizeWormParams,
} from './gear-math.js';
import { pitchRadius } from './constraints.js';
import {
    wormGeometry,
    sampleWormProfile,
    wormWheelAngle,
} from './profiles/worm.js';
import { sampleExternalGear } from './profiles/involute.js';
import { drawInvoluteGear, drawPolylineAt } from './render.js';

const DEFAULTS = { threads: 1, wheelTeeth: 30 };

export function createWormDemo(canvas) {
    let params = normalizeWormParams(DEFAULTS);

    function getReduction() {
        return params.wheelTeeth / params.threads;
    }

    function getReductionLabel() {
        const { threads, wheelTeeth } = params;
        const threadLabel = threads === 1 ? '1 thread' : `${threads} threads`;
        return `Reduction: ${formatRatio(getReduction())} · ${threadLabel} · Wheel ${wheelTeeth}T`;
    }

    function drawFrame(ctx, width, height, time) {
        clearBackground(ctx, width, height);

        const { threads, wheelTeeth } = params;
        const cx = width / 2;
        const cy = height / 2 + 20;
        const maxDiameter = Math.min(width, height) * 0.44;
        const module = maxDiameter / wheelTeeth;
        const geom = wormGeometry(wheelTeeth, module, threads);
        const wheelR = geom.wheelR;

        const wormAngle = time * 0.5;
        const wheelAngle = wormWheelAngle(wormAngle, threads, wheelTeeth);

        const wormX = cx - wheelR - 30;
        const wormY = cy - wheelR - 10;
        const wormPath = sampleWormProfile(wheelR * 1.4, threads, wormAngle);

        drawInvoluteGear(ctx, cx, cy, wheelTeeth, module, wheelAngle, {
            fill: '#4a90d9',
            label: `${wheelTeeth}T`,
            holeRadius: wheelR * 0.2,
            sampleFn: sampleExternalGear,
        });

        drawPolylineAt(ctx, wormX, wormY, 0, wormPath, {
            fill: '#e8a838',
            stroke: '#333',
            lineWidth: 1.5,
            close: true,
        });

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(wormX - 60, wormY);
        ctx.lineTo(cx + wheelR + 40, wormY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        drawLabel(ctx, wormX, wormY - 35, 'Worm (input)', '#e8a838', 12);
        drawLabel(ctx, cx, cy + wheelR + 35, 'Worm wheel (output)', '#4a90d9', 12);
        drawLabel(ctx, cx, height - 24, `${formatRatio(getReduction())} · self-locking`, '#ffcc00', 14);
    }

    const controller = createDemoController(canvas, drawFrame);

    return {
        ...controller,
        getParams: () => ({ ...params }),
        setParams(updates) {
            params = normalizeWormParams({ ...params, ...updates });
            controller.redraw();
            return params;
        },
        getReduction,
        getReductionLabel,
    };
}
