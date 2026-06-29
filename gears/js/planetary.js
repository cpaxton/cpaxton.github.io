import {
    clearBackground,
    createDemoController,
    drawLabel,
    formatRatio,
    moduleFromMaxDiameter,
    normalizePlanetaryParams,
} from './gear-math.js';
import { pitchRadius, planetaryRingTeeth } from './constraints.js';
import { planetaryCarrierAngle } from './kinematics.js';
import { drawContactOverlay, formatContactReadout } from './contact-overlay.js';
import { createWobbleTracker, drawWobbleIndicator } from './overlays.js';
import {
    measurePlanetaryContacts,
    planetaryPlanetAngleWithOffset,
    solvePlanetaryAssembly,
    subsampleProfile,
} from './mesh-solver.js';
import { sampleExternalGear, sampleInternalGear } from './profiles/involute.js';
import { estimatePlanetary, estimateLabel } from './estimates.js';
import { drawInvoluteGear, drawProfileAt } from './render.js';

const NUM_PLANETS = 3;
const DEFAULTS = { sunTeeth: 12, planetTeeth: 12 };

function buildAssembly(sunTeeth, planetTeeth, ringTeeth, module) {
    const sunProfile = sampleExternalGear(sunTeeth, module);
    const planetProfile = sampleExternalGear(planetTeeth, module);
    const ringPath = sampleInternalGear(ringTeeth, module);
    const solved = solvePlanetaryAssembly({
        sunProfile,
        planetProfile,
        ringProfile: ringPath,
        sunTeeth,
        planetTeeth,
        ringTeeth,
        numPlanets: NUM_PLANETS,
        module,
        coarseRingSteps: 36,
    });

    return {
        ringPhase: solved.ringPhase,
        planetOffsets: solved.planetOffsets,
        ringPath,
        sunProfile,
        planetProfile,
        sunContact: subsampleProfile(sunProfile),
        planetContact: subsampleProfile(planetProfile),
        ringContact: subsampleProfile(ringPath),
    };
}

export function createPlanetaryDemo(canvas) {
    let params = normalizePlanetaryParams(DEFAULTS);
    let assembly = null;
    let assemblyKey = '';
    let lastContact = null;
    let lastModule = 1;
    const wobbleTracker = createWobbleTracker();

    function getRingTeeth() {
        return planetaryRingTeeth(params.sunTeeth, params.planetTeeth);
    }

    function getReduction() {
        const ringTeeth = getRingTeeth();
        return (params.sunTeeth + ringTeeth) / params.sunTeeth;
    }

    function getReductionLabel() {
        const ringTeeth = getRingTeeth();
        const est = estimateLabel(estimatePlanetary(params));
        return `Reduction: ${formatRatio(getReduction())} · Sun ${params.sunTeeth}T · Planet ${params.planetTeeth}T · Ring ${ringTeeth}T · ${est}`;
    }

    function getContactInfo() {
        if (!lastContact) return null;
        return {
            contact: lastContact,
            readout: formatContactReadout(lastContact, lastModule),
        };
    }

    function ensureAssembly(module) {
        const ringTeeth = getRingTeeth();
        const key = `${params.sunTeeth}:${params.planetTeeth}:${module.toFixed(6)}`;
        if (assemblyKey !== key) {
            assembly = buildAssembly(params.sunTeeth, params.planetTeeth, ringTeeth, module);
            assemblyKey = key;
        }
        return assembly;
    }

    function drawFrame(ctx, width, height, time, meta = {}) {
        clearBackground(ctx, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const { sunTeeth, planetTeeth } = params;
        const ringTeeth = getRingTeeth();

        const maxRadius = Math.min(width, height) * 0.36;
        const module = moduleFromMaxDiameter(maxRadius * 2, sunTeeth + 2 * planetTeeth);
        lastModule = module;
        const sunR = pitchRadius(sunTeeth, module);
        const planetR = pitchRadius(planetTeeth, module);
        const orbitR = sunR + planetR;
        const ringR = orbitR + planetR;

        const {
            ringPhase,
            planetOffsets,
            ringPath,
            sunProfile,
            planetProfile,
            sunContact,
            planetContact,
            ringContact,
        } = ensureAssembly(module);

        const sunOmega = 0.6;
        const sunAngle = sunOmega * time;
        const carrierAngle = planetaryCarrierAngle(sunAngle, sunTeeth, ringTeeth);

        drawProfileAt(ctx, cx, cy, ringPhase, ringPath, {
            fill: '#556677',
            stroke: '#333',
            close: true,
        });

        drawInvoluteGear(ctx, cx, cy, sunTeeth, module, sunAngle, {
            fill: '#e8a838',
            label: 'Sun',
            holeRadius: sunR * 0.3,
            showPitchCircle: false,
            points: sunProfile,
        });

        for (let i = 0; i < NUM_PLANETS; i++) {
            const planetOrbitAngle = carrierAngle + (i / NUM_PLANETS) * Math.PI * 2;
            const px = cx + Math.cos(planetOrbitAngle) * orbitR;
            const py = cy + Math.sin(planetOrbitAngle) * orbitR;
            const planetSpin = planetaryPlanetAngleWithOffset(
                sunAngle,
                planetOrbitAngle,
                sunTeeth,
                planetTeeth,
                planetOffsets[i]
            );

            drawInvoluteGear(ctx, px, py, planetTeeth, module, planetSpin, {
                fill: '#4a90d9',
                holeRadius: planetR * 0.25,
                showPitchCircle: false,
                points: planetProfile,
            });
        }

        const planetSpins = Array.from({ length: NUM_PLANETS }, (_, i) => {
            const orbit = carrierAngle + (i / NUM_PLANETS) * Math.PI * 2;
            return planetaryPlanetAngleWithOffset(
                sunAngle, orbit, sunTeeth, planetTeeth, planetOffsets[i]
            );
        });
        if (meta.forceRefine || meta.frame % 3 === 0 || !lastContact) {
            lastContact = measurePlanetaryContacts({
                sunProfile: sunContact,
                planetProfile: planetContact,
                ringProfile: ringContact,
                sunTeeth,
                planetTeeth,
                ringTeeth,
                ringPhase,
                planetOffsets,
                sunAngle,
                cx,
                cy,
                orbitR,
                numPlanets: NUM_PLANETS,
                planetSpins,
            });
        }
        drawContactOverlay(ctx, lastContact, module);

        ctx.save();
        ctx.strokeStyle = 'rgba(255,204,0,0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        drawLabel(ctx, cx, cy - ringR - 22, 'Ring (fixed)', '#aaa', 12);
        drawLabel(ctx, cx + ringR + 40, cy, 'Carrier\n(output)', '#ffcc00', 11);
        drawLabel(ctx, cx, cy + ringR + 30, 'Sun (input)', '#e8a838', 12);
        drawLabel(ctx, cx, height - 24, formatRatio(getReduction()), '#ffcc00', 14);

        const planetOrbitAngle = carrierAngle;
        const wobbleX = cx + Math.cos(planetOrbitAngle) * orbitR;
        const wobbleY = cy + Math.sin(planetOrbitAngle) * orbitR;
        drawWobbleIndicator(ctx, cx, cy, wobbleX, wobbleY, wobbleTracker, {
            label: 'Orbiting planet mass',
            color: '#ff6b8a',
        });
    }

    const controller = createDemoController(canvas, drawFrame);

    return {
        ...controller,
        getParams: () => ({ ...params }),
        setParams(updates) {
            params = normalizePlanetaryParams({ ...params, ...updates });
            assemblyKey = '';
            wobbleTracker.reset();
            controller.redraw();
            return params;
        },
        getReduction,
        getReductionLabel,
        getContactInfo,
    };
}
