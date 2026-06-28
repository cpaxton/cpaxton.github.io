import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    spurDrivenAngle,
    spurDrivenOmega,
    planetaryCarrierAngle,
    planetaryCarrierOmega,
    planetaryPlanetAngleFromCounts,
    wormWheelAngle,
    cycloidalRatio,
    cycloidalMotion,
    harmonicFlexAngle,
    harmonicRatio,
} from '../kinematics.js';
import {
    assertCycloidalValid,
    assertHarmonicValid,
    assertPlanetaryValid,
    centerDistance,
    normalizeSpurParams,
    normalizeCycloidalParams,
} from '../constraints.js';

const TAU = Math.PI * 2;

describe('spur kinematics', () => {
    it('enforces tooth ratio over one revolution', () => {
        const n1 = 18;
        const n2 = 36;
        const phase = spurDrivenAngle(0, n1, n2);
        const after = spurDrivenAngle(TAU, n1, n2);
        assert.ok(Math.abs(after - phase + TAU / 2) < 1e-9);
    });

    it('matches omega ratio', () => {
        assert.equal(spurDrivenOmega(0.8, 18, 36), -0.4);
    });

    it('center distance from module', () => {
        assert.equal(centerDistance(2, 18, 36), 54);
    });

    it('normalizes spur parity', () => {
        assert.deepEqual(normalizeSpurParams({ driverTeeth: 18, drivenTeeth: 37 }), {
            driverTeeth: 18,
            drivenTeeth: 38,
        });
    });

    it('normalizes cycloidal variant', () => {
        assert.deepEqual(normalizeCycloidalParams({ lobes: 5, pins: 6, variant: 'rolling' }), {
            lobes: 5,
            pins: 6,
            variant: 'rolling',
            counterDisc: false,
        });
        assert.deepEqual(
            normalizeCycloidalParams({ lobes: 5, pins: 6, counterDisc: true }).counterDisc,
            true
        );
    });
});

describe('planetary kinematics', () => {
    it('ring teeth constraint', () => {
        assert.equal(assertPlanetaryValid(12, 12), 36);
    });

    it('carrier advances one tooth pitch per sun tooth step', () => {
        const ns = 12;
        const nr = 36;
        const dCarrier = planetaryCarrierAngle(TAU / ns, ns, nr) - planetaryCarrierAngle(0, ns, nr);
        assert.ok(Math.abs(dCarrier - TAU / (ns + nr)) < 1e-9);
    });

    it('carrier omega matches angle derivative', () => {
        const ns = 12;
        const nr = 36;
        assert.equal(planetaryCarrierOmega(0.6, ns, nr), planetaryCarrierAngle(0.6, ns, nr));
    });

    it('planet spin follows Willis law', () => {
        const ns = 12;
        const np = 12;
        const nr = 36;
        const beta = Math.PI / 4;
        const d = 1e-6;
        const a0 = planetaryPlanetAngleFromCounts(d, beta, ns, np, 0, 3);
        const a1 = planetaryPlanetAngleFromCounts(0, beta, ns, np, 0, 3);
        const numeric = (a0 - a1) / d;
        const expected = -ns / np;
        assert.ok(Math.abs(numeric - expected) < 1e-4);
        void nr;
    });
});

describe('worm kinematics', () => {
    it('wheel turns once per threads worm revolutions over wheel teeth', () => {
        const phase = wormWheelAngle(0, 1, 30);
        const after = wormWheelAngle(TAU * 30, 1, 30);
        assert.ok(Math.abs(after - phase - TAU) < 1e-6);
    });
});

describe('cycloidal kinematics', () => {
    it('ratio identity', () => {
        assert.equal(cycloidalRatio(6, 5), 6);
    });

    it('output slower than input', () => {
        assertCycloidalValid(5, 6);
        const m = cycloidalMotion(TAU, 6, 5);
        assert.ok(Math.abs(m.outputAngle - TAU / 6) < 1e-9);
    });
});

describe('harmonic kinematics', () => {
    it('ratio identity', () => {
        assertHarmonicValid(30, 32);
        assert.equal(harmonicRatio(30, 32), 16);
    });

    it('flex angle rate', () => {
        const flex = harmonicFlexAngle(TAU, 30, 32);
        assert.ok(Math.abs(flex + TAU / 15) < 1e-9);
    });
});
