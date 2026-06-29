import {
    clearBackground,
    createDemoController,
    drawLabel,
    formatRatio,
    isPhysicsMode,
    isSchematicMode,
    moduleFromMaxDiameter,
    normalizeSpurParams,
} from './gear-math.js';
import { centerDistance, pitchRadius } from './constraints.js';
import { drawContactOverlay, formatContactReadout } from './contact-overlay.js';
import { createWobbleTracker, drawWobbleIndicator } from './overlays.js';
import { measureSpurContact, solveSpurAssembly, subsampleProfile } from './mesh-solver.js';
import { sampleExternalGear } from './profiles/involute.js';
import { drawInvoluteGear } from './render.js';
import { drawRadialGearPair } from './schematic.js';

const DEFAULTS = { driverTeeth: 18, drivenTeeth: 36 };

export function createSpurDemo(canvas) {
    let params = normalizeSpurParams(DEFAULTS);
    let mesh = null;
    let meshKey = '';
    let driverPoints = null;
    let drivenPoints = null;
    let driverContact = null;
    let drivenContact = null;
    let lastContact = null;
    let lastModule = 1;
    const wobbleTracker = createWobbleTracker();

    function getReduction() {
        return params.drivenTeeth / params.driverTeeth;
    }

    function getReductionLabel() {
        return `Reduction: ${formatRatio(getReduction())} · Driver ${params.driverTeeth}T · Driven ${params.drivenTeeth}T`;
    }

    function getContactInfo() {
        if (!isPhysicsMode() || !lastContact) return null;
        return {
            contact: lastContact,
            readout: formatContactReadout(lastContact, lastModule),
        };
    }

    function ensureMesh(module, driverX, drivenX, cy) {
        const key = `${params.driverTeeth}:${params.drivenTeeth}:${module.toFixed(6)}`;
        if (meshKey !== key) {
            driverPoints = sampleExternalGear(params.driverTeeth, module);
            drivenPoints = sampleExternalGear(params.drivenTeeth, module);
            driverContact = subsampleProfile(driverPoints);
            drivenContact = subsampleProfile(drivenPoints);
            mesh = solveSpurAssembly({
                driverProfile: driverPoints,
                drivenProfile: drivenPoints,
                driverX,
                driverY: cy,
                drivenX,
                drivenY: cy,
                driverTeeth: params.driverTeeth,
                drivenTeeth: params.drivenTeeth,
                module,
            });
            meshKey = key;
        }
        return mesh;
    }

    function drawFrame(ctx, width, height, time, meta = {}) {
        clearBackground(ctx, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const { driverTeeth, drivenTeeth } = params;

        const maxDiameter = Math.min(width, height) * 0.76;
        const module = moduleFromMaxDiameter(maxDiameter, driverTeeth + drivenTeeth);
        lastModule = module;
        const driverR = pitchRadius(driverTeeth, module);
        const drivenR = pitchRadius(drivenTeeth, module);
        const dist = centerDistance(module, driverTeeth, drivenTeeth);

        const driverOmega = 0.8;
        const driverAngle = driverOmega * time;

        const driverX = cx - dist / 2;
        const drivenX = cx + dist / 2;

        if (isSchematicMode()) {
            const ratio = driverTeeth / drivenTeeth;
            const drivenAngle = -ratio * driverAngle + Math.PI;
            drawRadialGearPair(ctx, {
                x: driverX, y: cy, pitchRadius: driverR, teeth: driverTeeth,
                angle: driverAngle, options: { fill: '#e8a838', label: `${driverTeeth}T` },
            }, {
                x: drivenX, y: cy, pitchRadius: drivenR, teeth: drivenTeeth,
                angle: drivenAngle, options: { fill: '#4a90d9', label: `${drivenTeeth}T` },
            });
            lastContact = null;
        } else {
            const spurMesh = ensureMesh(module, driverX, drivenX, cy);
            const angles = spurMesh.anglesAt(driverAngle);
            drawInvoluteGear(ctx, driverX, cy, driverTeeth, module, angles.driver, {
                fill: '#e8a838',
                label: `${driverTeeth}T`,
                points: driverPoints,
            });
            drawInvoluteGear(ctx, drivenX, cy, drivenTeeth, module, angles.driven, {
                fill: '#4a90d9',
                label: `${drivenTeeth}T`,
                points: drivenPoints,
            });

            if (isPhysicsMode()) {
                if (meta.forceRefine || meta.frame % 3 === 0 || !lastContact) {
                    lastContact = measureSpurContact({
                        driverProfile: driverContact,
                        drivenProfile: drivenContact,
                        driverX,
                        driverY: cy,
                        drivenX,
                        drivenY: cy,
                        driverAngle: angles.driver,
                        drivenAngle: angles.driven,
                    });
                    lastContact.label = 'Driver–driven mesh';
                }
                drawContactOverlay(ctx, lastContact, module);
            }
        }

        drawLabel(ctx, driverX, cy - driverR - 20, 'Driver (input)', '#ccc', 12);
        drawLabel(ctx, drivenX, cy - drivenR - 20, 'Driven (output)', '#ccc', 12);
        drawLabel(ctx, cx, height - 24, `Speed ratio: ${formatRatio(getReduction())}`, '#ffcc00', 14);

        drawWobbleIndicator(ctx, drivenX, cy, drivenX, cy, wobbleTracker, {
            label: 'Output shaft (coaxial)',
            color: '#7ec8ff',
            subdued: true,
        });
    }

    const controller = createDemoController(canvas, drawFrame);

    return {
        ...controller,
        getParams: () => ({ ...params }),
        setParams(updates) {
            params = normalizeSpurParams({ ...params, ...updates });
            meshKey = '';
            wobbleTracker.reset();
            controller.redraw();
            return params;
        },
        getReduction,
        getReductionLabel,
        getContactInfo,
    };
}
