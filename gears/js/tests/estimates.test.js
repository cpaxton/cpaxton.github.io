import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    estimateSpur,
    estimatePlanetary,
    estimateCycloidal,
    estimateHarmonic,
    formatEstimate,
} from '../estimates.js';

describe('gear estimates', () => {
    it('returns positive spur weight and cost', () => {
        const e = estimateSpur({ driverTeeth: 18, drivenTeeth: 36 });
        assert.ok(e.weightKg > 0 && e.costUsd > 0);
        assert.match(formatEstimate(e.weightKg, e.costUsd), /kg|g/);
        assert.match(formatEstimate(e.weightKg, e.costUsd), /\$/);
    });

    it('ranks cycloidal heavier and pricier than spur at defaults', () => {
        const spur = estimateSpur({ driverTeeth: 18, drivenTeeth: 36 });
        const cyclo = estimateCycloidal({ lobes: 5, pins: 6, counterDisc: false });
        assert.ok(cyclo.weightKg > spur.weightKg);
        assert.ok(cyclo.costUsd > spur.costUsd);
    });

    it('adds mass and cost for cycloidal counter disc', () => {
        const single = estimateCycloidal({ lobes: 5, pins: 6, counterDisc: false });
        const dual = estimateCycloidal({ lobes: 5, pins: 6, counterDisc: true });
        assert.ok(dual.weightKg > single.weightKg);
        assert.ok(dual.costUsd > single.costUsd);
    });

    it('returns planetary and harmonic estimates', () => {
        const p = estimatePlanetary({ sunTeeth: 12, planetTeeth: 12 });
        const h = estimateHarmonic({ flexTeeth: 30, circularTeeth: 32 });
        assert.ok(p.weightKg > 0 && h.weightKg > 0);
    });
});
