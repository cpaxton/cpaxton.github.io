/** Tooth-count rules, geometry constraints, and param normalization. */

export const DEFAULT_PRESSURE_ANGLE = (20 * Math.PI) / 180;
/** Nominal addendum / dedendum as multiples of module (reduced addendum adds tip clearance). */
export const ADDENDUM_COEFF = 0.6;
export const DEDENDUM_COEFF = 0.95;
/** Planetary externals: shorter addendum + scale so tips clear the ring pitch circle. */
export const PLANETARY_ADDENDUM_COEFF = 0.42;
export const PLANETARY_PROFILE_SCALE = 0.928;

/** Desired mesh clearance as multiples of module (contact patch, not polygon overlap). */
export const TARGET_MESH_CLEARANCE_COEFF = 0.045;
export const MIN_MESH_CLEARANCE_COEFF = 0.012;
export const MAX_MESH_CLEARANCE_COEFF = 0.55;

/** Score how close a measured clearance is to the design target (penalize too-tight fits). */
export function meshClearanceScore(clearance, module = 1) {
    const target = TARGET_MESH_CLEARANCE_COEFF * module;
    const min = MIN_MESH_CLEARANCE_COEFF * module;
    if (clearance < min) {
        return (min - clearance) * 10 + Math.abs(clearance - target);
    }
    return Math.abs(clearance - target);
}

export function isMeshClearanceOk(clearance, module = 1) {
    return clearance >= MIN_MESH_CLEARANCE_COEFF * module
        && clearance <= MAX_MESH_CLEARANCE_COEFF * module;
}

export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function formatRatio(ratio) {
    const rounded = Math.round(ratio * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}:1` : `${rounded.toFixed(1)}:1`;
}

export function pitchRadius(teeth, module) {
    return (teeth * module) / 2;
}

export function centerDistance(module, teethA, teethB) {
    return (module * (teethA + teethB)) / 2;
}

export function planetaryRingTeeth(sunTeeth, planetTeeth) {
    return sunTeeth + 2 * planetTeeth;
}

export const computePlanetaryRing = planetaryRingTeeth;

export function normalizeSpurParams(params) {
    const driverTeeth = clamp(Math.round(params.driverTeeth), 12, 24);
    let drivenTeeth = clamp(Math.round(params.drivenTeeth), driverTeeth + 6, 72);
    if (drivenTeeth % 2 !== driverTeeth % 2) {
        drivenTeeth += 1;
    }
    return { driverTeeth, drivenTeeth };
}

export function normalizePlanetaryParams(params) {
    const sunTeeth = clamp(Math.round(params.sunTeeth), 8, 20);
    const planetTeeth = clamp(Math.round(params.planetTeeth), 8, 24);
    return { sunTeeth, planetTeeth };
}

export function normalizeCycloidalParams(params) {
    const lobes = clamp(Math.round(params.lobes), 4, 10);
    const pins = clamp(Math.round(params.pins), lobes + 1, lobes + 15);
    const variant = params.variant === 'rolling' ? 'rolling' : 'fixed-pin';
    const counterDisc = params.counterDisc === true;
    return { lobes, pins, variant, counterDisc };
}

export function normalizeHarmonicParams(params) {
    let flexTeeth = clamp(Math.round(params.flexTeeth / 2) * 2, 24, 60);
    let circularTeeth = clamp(Math.round(params.circularTeeth / 2) * 2, flexTeeth + 2, flexTeeth + 10);
    if (circularTeeth <= flexTeeth) {
        circularTeeth = flexTeeth + 2;
    }
    return { flexTeeth, circularTeeth };
}

export function normalizeWormParams(params) {
    const threads = clamp(Math.round(params.threads), 1, 3);
    const wheelTeeth = clamp(Math.round(params.wheelTeeth), 10, 60);
    return { threads, wheelTeeth };
}

export function assertCycloidalValid(lobes, pins) {
    if (pins <= lobes) {
        throw new Error(`Cycloidal requires pins > lobes (${pins} <= ${lobes})`);
    }
}

export function assertHarmonicValid(flexTeeth, circularTeeth) {
    if (circularTeeth <= flexTeeth) {
        throw new Error(`Harmonic requires circularTeeth > flexTeeth`);
    }
}

export function assertPlanetaryValid(sunTeeth, planetTeeth) {
    const ringTeeth = planetaryRingTeeth(sunTeeth, planetTeeth);
    if (ringTeeth !== sunTeeth + 2 * planetTeeth) {
        throw new Error('Planetary ring teeth constraint violated');
    }
    return ringTeeth;
}

/** Pick module so the largest pitch circle fits `maxDiameter`. */
export function moduleFromMaxDiameter(maxDiameter, teethSum) {
    return maxDiameter / teethSum;
}
