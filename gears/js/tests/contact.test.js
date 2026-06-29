import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    isMeshClearanceOk,
    isCycloidalPinClearanceOk,
    MIN_MESH_CLEARANCE_COEFF,
    pitchRadius,
    TARGET_MESH_CLEARANCE_COEFF,
} from '../constraints.js';
import {
    minContactDistance,
    measureCycloidalPinContact,
    measureHarmonicContact,
    samplePlanetaryClearance,
    solvePlanetaryAssembly,
    solveSpurAssembly,
} from '../mesh-solver.js';
import { sampleExternalGear, sampleInternalGear, halfToothAngleAtPitch, involuteFunction } from '../profiles/involute.js';
import {
    sampleFlexSpline,
    harmonicWaveRadii,
    sampleFlexAnnulus,
    sampleFlexToothOutlines,
} from '../profiles/harmonic.js';
import {
    cycloidalGeometry,
    sampleEquidistantCycloidalDisc,
    sampleFixedPinDisc,
    samplePinPositions,
    fixedPinDiscCenter,
} from '../profiles/trochoid.js';
import { cycloidalMotion } from '../kinematics.js';
import { solveCycloidalMeshPhase } from '../mesh-solver.js';

const TAU = Math.PI * 2;

describe('involute profiles', () => {
    it('uses inv(φ) in half-tooth angle', () => {
        const teeth = 18;
        const inv = involuteFunction();
        const half = halfToothAngleAtPitch(teeth);
        assert.ok(Math.abs(half - (Math.PI / teeth + inv)) < 1e-9);
    });

    it('generates external profiles with addendum beyond pitch', () => {
        const path = sampleExternalGear(18, 1);
        assert.ok(path.length > 100);
        const radii = path.map((p) => Math.hypot(p.x, p.y));
        assert.ok(Math.max(...radii) > 9);
        assert.ok(Math.min(...radii) < 9);
    });
});

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

    it('measures cycloidal disc–pin clearance', () => {
        const disc = [{ x: 12, y: 0 }, { x: 0, y: 12 }, { x: -12, y: 0 }, { x: 0, y: -12 }];
        const contact = measureCycloidalPinContact({
            discProfile: disc,
            discX: 0,
            discY: 0,
            discAngle: 0,
            housingX: 0,
            housingY: 0,
            pins: [{ x: 20, y: 0 }],
            pinRadius: 2,
        });
        assert.ok(contact.clearance > 5 && contact.clearance < 7);
        assert.ok(!contact.engaged);
        assert.ok(contact.pointA && contact.pointB);
    });

    it('keeps fixed-pin cycloidal disc outside engaged pin through a cycle', () => {
        const pinRingRadius = 200;
        const pins = 6;
        const lobes = 5;
        const geom = cycloidalGeometry(pins, lobes, pinRingRadius);
        const disc = sampleEquidistantCycloidalDisc(
            pinRingRadius,
            geom.fixedPinEccentricity,
            pins,
            geom.pinRadius,
            360
        );
        const pinPositions = samplePinPositions(pins, pinRingRadius);
        const meshPhase = solveCycloidalMeshPhase({
            discProfile: disc,
            pins,
            lobes,
            pinRingRadius,
            eccentricity: geom.fixedPinEccentricity,
            pinRadius: geom.pinRadius,
        });
        const cx = 400;
        const cy = 300;
        let engagedSteps = 0;
        let penetrations = 0;

        for (let step = 0; step < 80; step++) {
            const motion = cycloidalMotion((step / 80) * TAU, pins, lobes);
            const center = fixedPinDiscCenter(motion.orbitAngle, geom.fixedPinEccentricity);
            const angle = motion.fixedPinDiscAngle + meshPhase;
            const contact = measureCycloidalPinContact({
                discProfile: disc,
                discX: cx + center.x,
                discY: cy + center.y,
                discAngle: angle,
                housingX: cx,
                housingY: cy,
                pins: pinPositions,
                pinRadius: geom.pinRadius,
            });
            if (!contact.engaged) continue;
            engagedSteps++;
            if (!isCycloidalPinClearanceOk(contact.clearance, geom.pinRadius)) {
                penetrations++;
            }
            assert.ok(
                isCycloidalPinClearanceOk(contact.clearance, geom.pinRadius),
                `cycloidal clearance ${contact.clearance} at step ${step}`
            );
        }
        assert.ok(penetrations === 0, `expected no deep pin penetration, got ${penetrations}`);
        assert.ok(engagedSteps >= 50, `expected frequent pin engagement, got ${engagedSteps}/80`);
    });

    it('counter disc mirrors primary orbit and meshes 180° out of phase', () => {
        const pinRingRadius = 200;
        const pins = 6;
        const lobes = 5;
        const geom = cycloidalGeometry(pins, lobes, pinRingRadius);
        const disc = sampleEquidistantCycloidalDisc(
            pinRingRadius,
            geom.fixedPinEccentricity,
            pins,
            geom.pinRadius,
            360
        );
        const pinPositions = samplePinPositions(pins, pinRingRadius);
        const meshPhase = solveCycloidalMeshPhase({
            discProfile: disc,
            pins,
            lobes,
            pinRingRadius,
            eccentricity: geom.fixedPinEccentricity,
            pinRadius: geom.pinRadius,
        });
        const cx = 400;
        const cy = 300;
        let counterEngaged = 0;

        for (let step = 0; step < 80; step++) {
            const motion = cycloidalMotion((step / 80) * TAU, pins, lobes);
            const primaryCenter = fixedPinDiscCenter(motion.orbitAngle, geom.fixedPinEccentricity);
            const counterCenter = fixedPinDiscCenter(motion.orbitAngle + Math.PI, geom.fixedPinEccentricity);
            const primaryAngle = motion.fixedPinDiscAngle + meshPhase;
            const counterAngle = primaryAngle + Math.PI;

            assert.ok(
                Math.hypot(primaryCenter.x + counterCenter.x, primaryCenter.y + counterCenter.y) < 1e-9,
                `counter orbit should cancel primary at step ${step}`
            );

            let angleDiff = Math.abs(primaryAngle - counterAngle);
            angleDiff = Math.min(angleDiff, TAU - angleDiff);
            assert.ok(
                Math.abs(angleDiff - Math.PI) < 1e-9,
                `counter disc should lead primary by π at step ${step}`
            );

            const contact = measureCycloidalPinContact({
                discProfile: disc,
                discX: cx + counterCenter.x,
                discY: cy + counterCenter.y,
                discAngle: counterAngle,
                housingX: cx,
                housingY: cy,
                pins: pinPositions,
                pinRadius: geom.pinRadius,
            });
            if (contact.engaged) {
                counterEngaged++;
                assert.ok(isCycloidalPinClearanceOk(contact.clearance, geom.pinRadius));
            }
        }
        assert.ok(counterEngaged >= 50, `expected counter pin engagement, got ${counterEngaged}/80`);
    });

    it('measures harmonic flex–ring clearance', () => {
        const module = 1;
        const flexTeeth = 30;
        const circularTeeth = 32;
        const flexProfile = sampleFlexSpline(flexTeeth, module, 0, 0, circularTeeth);
        const ringProfile = sampleInternalGear(circularTeeth, module);
        const contact = measureHarmonicContact({
            flexProfile,
            ringProfile,
            cx: 0,
            cy: 0,
            generatorAngle: 0,
        });
        assert.ok(Number.isFinite(contact.clearance));
        assert.ok(contact.pointA && contact.pointB);
    });

    it('strains flex involute teeth on a true ellipse', () => {
        const module = 1;
        const flexTeeth = 30;
        const circularTeeth = 32;
        const flexR = pitchRadius(flexTeeth, module);
        const { major, minor } = harmonicWaveRadii(flexR, flexTeeth, circularTeeth);
        const profile = sampleFlexSpline(flexTeeth, module, 0, 0, circularTeeth);
        const annulus = sampleFlexAnnulus(flexTeeth, module, 0, 0, circularTeeth);
        const outlines = sampleFlexToothOutlines(flexTeeth, module, 0, 0, circularTeeth);

        let maxR = 0;
        let minR = Infinity;
        for (const p of profile) {
            const r = Math.hypot(p.x, p.y);
            maxR = Math.max(maxR, r);
            minR = Math.min(minR, r);
        }

        assert.ok(maxR > flexR + module * 0.4, 'visible addendum on ellipse');
        assert.ok(minR < flexR, 'dedendum valleys between teeth');
        assert.ok(maxR - minR > module * 0.8, 'distinct tooth height on oval');
        assert.ok(annulus.length > profile.length, 'annulus includes inner bore');
        assert.equal(outlines.length, flexTeeth);
    });
});
