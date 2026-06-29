/**
 * Cycloidal (trochoid) disc, pin layout, and rolling hypocycloid geometry.
 */

import { cycloidalRatio } from '../kinematics.js';
import { TARGET_MESH_CLEARANCE_COEFF } from '../constraints.js';

const TAU = Math.PI * 2;

export const CYCLOIDAL_VARIANTS = ['fixed-pin', 'rolling'];

/** Shortening coefficient K1 = e·Zr/Rp (typical 0.6–0.75). */
export const CYCLOIDAL_SHORTENING_K1 = 0.65;

/** Pin radius from ring spacing and profile clearance (fraction of max conjugate radius). */
export function cycloidalPinRadius(pinRingRadius, pins, eccentricity, fill = 0.32) {
    const maxRadius = pinRingRadius * Math.sin(Math.PI / pins) - eccentricity;
    return Math.max(3, maxRadius * fill);
}

/** Geometry derived from pin/lobe counts. */
export function cycloidalGeometry(pins, lobes, pinRingRadius) {
    const ratio = cycloidalRatio(pins, lobes);
    const rollingRadius = pinRingRadius / lobes;
    const fixedPinEccentricity = CYCLOIDAL_SHORTENING_K1 * pinRingRadius / pins;
    const hypocycloidOrbit = pinRingRadius - rollingRadius;
    const discRadius = pinRingRadius - fixedPinEccentricity;
    const pinRadius = cycloidalPinRadius(
        pinRingRadius,
        pins,
        fixedPinEccentricity
    );
    return {
        ratio,
        rollingRadius,
        fixedPinEccentricity,
        hypocycloidOrbit,
        discRadius,
        pinRingRadius,
        pinRadius,
    };
}

/** Pin positions on the fixed ring. */
export function samplePinPositions(pins, pinRingRadius) {
    const positions = [];
    for (let i = 0; i < pins; i++) {
        const a = (i / pins) * TAU - Math.PI / 2;
        positions.push({
            x: Math.cos(a) * pinRingRadius,
            y: Math.sin(a) * pinRingRadius,
            angle: a,
        });
    }
    return positions;
}

/**
 * Working cycloidal disc profile: equidistant offset from the shortened epicycloid.
 * SolidWorks / RV-style parametric form in disc-local coordinates (origin at disc center).
 * Produces Zr − 1 lobes for Zr ring pins.
 */
export function sampleEquidistantCycloidalDisc(
    pinRingRadius,
    eccentricity,
    pinCount,
    pinRadius,
    points = 360
) {
    const R = pinRingRadius;
    const E = eccentricity;
    const N = pinCount;
    const Rr = pinRadius;
    const path = [];

    for (let i = 0; i <= points; i++) {
        const t = (i / points) * TAU;
        const s = Math.sin((1 - N) * t);
        const c = (1 - N) * t;
        const denom = R / (E * N) - Math.cos(c);
        const a = Math.atan2(s, denom);
        path.push({
            x: R * Math.cos(t) - Rr * Math.cos(t + a) - E * Math.cos(N * t),
            y: -R * Math.sin(t) + Rr * Math.sin(t + a) + E * Math.sin(N * t),
        });
    }

    return path;
}

/**
 * Fixed-pin disc: schematic cosine lobes (schematic / fast preview).
 * When pinRingRadius and pinRadius are given, lobe peaks are clamped so a lobe
 * aligned with eccentricity toward the pin ring stays outside the pin circles.
 */
export function sampleFixedPinDisc(
    discRadius,
    lobes,
    eccentricity,
    points = 180,
    pinRingRadius = null,
    pinRadius = 0
) {
    const valleyR = discRadius - eccentricity * 0.88;
    let peakR = discRadius;
    if (pinRingRadius != null) {
        const targetClearance = TARGET_MESH_CLEARANCE_COEFF * pinRadius;
        const conjugatePeak = pinRingRadius - pinRadius - eccentricity - targetClearance;
        const schematicExtension = eccentricity * 0.064;
        peakR = Math.min(
            discRadius + schematicExtension,
            conjugatePeak + schematicExtension
        );
    }
    const path = [];

    for (let i = 0; i <= points; i++) {
        const t = (i / points) * TAU;
        const r = valleyR + ((peakR - valleyR) * (1 + Math.cos(lobes * t))) / 2;
        path.push({ x: Math.cos(t) * r, y: Math.sin(t) * r });
    }

    return path;
}

/** @deprecated alias */
export const sampleCycloidalDisc = sampleFixedPinDisc;

/**
 * True hypocycloid in the rolling-circle frame (circle of radius r rolls inside R = r·L).
 */
export function sampleHypocycloidInRollingFrame(fixedR, lobes, points = 180) {
    const r = fixedR / lobes;
    const orbit = fixedR - r;
    const path = [];

    for (let i = 0; i <= points; i++) {
        const t = (i / points) * TAU;
        const x = orbit * Math.cos(t) + r * Math.cos((lobes - 1) * t);
        const y = orbit * Math.sin(t) - r * Math.sin((lobes - 1) * t);
        path.push({ x: x - orbit, y });
    }

    return path;
}

/** Disc center for fixed-pin eccentric cam (smaller orbit). */
export function fixedPinDiscCenter(inputAngle, eccentricity) {
    return {
        x: Math.cos(inputAngle) * eccentricity,
        y: Math.sin(inputAngle) * eccentricity,
    };
}

/** Disc / rolling-circle center for hypocycloid (orbit radius R − r). */
export function rollingDiscCenter(inputAngle, hypocycloidOrbit) {
    return {
        x: Math.cos(inputAngle) * hypocycloidOrbit,
        y: Math.sin(inputAngle) * hypocycloidOrbit,
    };
}

/** Spin of the generating circle rolling inside the fixed pitch circle. */
export function rollingCircleSpin(inputAngle, lobes) {
    return inputAngle * (lobes - 1);
}

/** Initial guess for fixed-pin assembly phase (full value comes from mesh solver). */
export function fixedPinDiscMeshPhase(pinRingRadius, eccentricity) {
    return Math.atan2(-pinRingRadius, -eccentricity);
}

/** Align hypocycloid cusp toward the fixed pitch circle at rest. */
export function rollingDiscMeshPhase() {
    return 0;
}

export function cycloidalDiscCenter(inputAngle, eccentricity) {
    return fixedPinDiscCenter(inputAngle, eccentricity);
}

export function cycloidalDiscMeshPhase(pinRingRadius, eccentricity) {
    return fixedPinDiscMeshPhase(pinRingRadius, eccentricity);
}
