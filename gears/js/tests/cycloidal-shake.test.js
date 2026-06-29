import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    cycloidalGeometry,
    sampleEquidistantCycloidalDisc,
    fixedPinDiscCenter,
} from '../profiles/trochoid.js';
import { cycloidalMotion } from '../kinematics.js';
import { cycloidalMassShake } from '../cycloidal-shake.js';

const TAU = Math.PI * 2;

describe('cycloidal mass shake', () => {
    it('single disc shakes; counter disc cancels COM wobble', () => {
        const pins = 6;
        const lobes = 5;
        const pinRingRadius = 160;
        const geom = cycloidalGeometry(pins, lobes, pinRingRadius);
        const profile = sampleEquidistantCycloidalDisc(
            pinRingRadius,
            geom.fixedPinEccentricity,
            pins,
            geom.pinRadius,
            240
        );
        const meshPhase = -3.0;

        let maxSingle = 0;
        let maxBalanced = 0;

        for (let step = 0; step < 80; step++) {
            const motion = cycloidalMotion((step / 80) * TAU, pins, lobes);
            const single = cycloidalMassShake({
                profile,
                meshPhase,
                motion,
                geom,
                counterDisc: false,
            });
            const balanced = cycloidalMassShake({
                profile,
                meshPhase,
                motion,
                geom,
                counterDisc: true,
            });
            maxSingle = Math.max(maxSingle, Math.hypot(single.wobble.x, single.wobble.y));
            maxBalanced = Math.max(maxBalanced, Math.hypot(balanced.wobble.x, balanced.wobble.y));
        }

        assert.ok(maxSingle > geom.fixedPinEccentricity * 0.5, 'single disc should show eccentric shake');
        assert.ok(maxBalanced < 0.05, `counter pair should cancel shake, got ${maxBalanced}`);
    });

    it('ghost center follows primary disc orbit with counter disc on', () => {
        const pins = 6;
        const lobes = 5;
        const pinRingRadius = 160;
        const geom = cycloidalGeometry(pins, lobes, pinRingRadius);
        const profile = sampleEquidistantCycloidalDisc(
            pinRingRadius,
            geom.fixedPinEccentricity,
            pins,
            geom.pinRadius,
            120
        );
        const motion = cycloidalMotion(0.25, pins, lobes);
        const shake = cycloidalMassShake({
            profile,
            meshPhase: -3,
            motion,
            geom,
            lobes,
            counterDisc: true,
            variant: 'fixed-pin',
        });
        assert.ok(
            Math.hypot(shake.primaryCenter.x, shake.primaryCenter.y) > geom.fixedPinEccentricity * 0.5
        );
    });
});
