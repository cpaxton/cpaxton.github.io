import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    isMeshClearanceOk,
    MIN_MESH_CLEARANCE_COEFF,
    pitchRadius,
    TARGET_MESH_CLEARANCE_COEFF,
} from '../constraints.js';
import {
    minContactDistance,
    samplePlanetaryClearance,
    solvePlanetaryAssembly,
    solveSpurAssembly,
} from '../mesh-solver.js';
import { sampleExternalGear, sampleInternalGear } from '../profiles/involute.js';

const TAU = Math.PI * 2;

describe('mesh solver', () => {
    it('aligns spur pair within clearance band', () => {
        const module = 1;
        const driverTeeth = 18;
        const drivenTeeth = 36;
        const dist = pitchRadius(driverTeeth, module) + pitchRadius(drivenTeeth, module);
        const driverProfile = sampleExternalGear(driverTeeth, module);
        const drivenProfile = sampleExternalGear(drivenTeeth, module);
        const mesh = solveSpurAssembly({
            driverProfile,
            drivenProfile,
            driverX: -dist / 2,
            driverY: 0,
            drivenX: dist / 2,
            drivenY: 0,
            driverTeeth,
            drivenTeeth,
            module,
        });

        let worst = Infinity;
        for (let s = 0; s < 12; s++) {
            const driverAngle = (s / 12) * TAU;
            const drivenAngle = mesh.anglesAt(driverAngle).driven;
            worst = Math.min(
                worst,
                minContactDistance(
                    driverProfile, -dist / 2, 0, driverAngle,
                    drivenProfile, dist / 2, 0, drivenAngle,
                    0, Math.PI
                )
            );
        }
        assert.ok(isMeshClearanceOk(worst, module), `spur worst clearance ${worst}`);
        assert.ok(
            Math.abs(worst - TARGET_MESH_CLEARANCE_COEFF * module)
            < TARGET_MESH_CLEARANCE_COEFF * module * 2,
            `spur clearance far from target ${worst}`
        );
    });

    it('aligns planetary assembly within clearance band', () => {
        const module = 1;
        const sunTeeth = 12;
        const planetTeeth = 12;
        const ringTeeth = 36;
        const sunProfile = sampleExternalGear(sunTeeth, module);
        const planetProfile = sampleExternalGear(planetTeeth, module);
        const ringProfile = sampleInternalGear(ringTeeth, module);

        const assembly = solvePlanetaryAssembly({
            sunProfile,
            planetProfile,
            ringProfile,
            sunTeeth,
            planetTeeth,
            ringTeeth,
            numPlanets: 3,
            module,
            coarseRingSteps: 24,
        });

        const staticWorst = samplePlanetaryClearance({
            sunProfile,
            planetProfile,
            ringProfile,
            sunTeeth,
            planetTeeth,
            ringTeeth,
            ringPhase: assembly.ringPhase,
            planetOffsets: assembly.planetOffsets,
            numPlanets: 3,
            steps: 24,
            module,
        });

        assert.ok(
            isMeshClearanceOk(assembly.clearance, module),
            `assembly clearance ${assembly.clearance}`
        );
        assert.ok(
            staticWorst >= MIN_MESH_CLEARANCE_COEFF * module * 0.65,
            `planetary static clearance ${staticWorst}`
        );
        assert.ok(
            assembly.ringClearance >= MIN_MESH_CLEARANCE_COEFF * module * 0.85,
            `planetary ring clearance ${assembly.ringClearance}`
        );
        assert.ok(
            assembly.sunClearance >= MIN_MESH_CLEARANCE_COEFF * module * 0.85,
            `planetary sun clearance ${assembly.sunClearance}`
        );
    });
});
