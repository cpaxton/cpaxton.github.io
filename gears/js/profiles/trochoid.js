/**
 * Cycloidal (trochoid) disc, pin layout, and rolling hypocycloid geometry.
 */

import { cycloidalRatio } from '../kinematics.js';
import { TARGET_MESH_CLEARANCE_COEFF } from '../constraints.js';

const TAU = Math.PI * 2;

export const CYCLOIDAL_VARIANTS = ['fixed-pin', 'rolling'];

/** Geometry derived from pin/lobe counts. */
export function cycloidalGeometry(pins, lobes, pinRingRadius) {
    const ratio = cycloidalRatio(pins, lobes);
    const rollingRadius = pinRingRadius / lobes;
    const fixedPinEccentricity = rollingRadius;
    const hypocycloidOrbit = pinRingRadius - rollingRadius;
    const discRadius = pinRingRadius - rollingRadius;
    const pinRadius = Math.min(
        10,
        ((TAU * pinRingRadius) / pins) * 0.11
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
 * Equidistant cycloidal disc (pin radius offset from epicycloid).
 * Profile in disc-local frame with crank at reference angle 0.
 */
export function sampleEquidistantCycloidalDisc(
    pinRingRadius,
    eccentricity,
    lobes,
    pinRadius,
    points = 360
) {
    const R = pinRingRadius;
    const E = eccentricity;
    const N = lobes;
    const rp = pinRadius;
    const refCenter = fixedPinDiscCenter(0, E);
    const path = [];

    for (let i = 0; i <= points; i++) {
        const alpha = (i / points) * TAU;
        const denom = Math.cos(N * alpha) - R / (E * (N + 1));
        const gamma = Math.atan2(Math.sin(N * alpha), denom);
        const x = R * Math.cos(alpha) - E * Math.cos((N + 1) * alpha) - rp * Math.cos(alpha - gamma);
        const y = R * Math.sin(alpha) - E * Math.sin((N + 1) * alpha) - rp * Math.sin(alpha - gamma);
        path.push({ x: x - refCenter.x, y: y - refCenter.y });
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
    rollingRadius,
    points = 180,
    pinRingRadius = null,
    pinRadius = 0
) {
    const valleyR = discRadius - rollingRadius * 0.88;
    let peakR = discRadius;
    if (pinRingRadius != null) {
        const eccentricity = rollingRadius;
        const targetClearance = TARGET_MESH_CLEARANCE_COEFF * pinRadius;
        const conjugatePeak = pinRingRadius - pinRadius - eccentricity - targetClearance;
        // Schematic cosine lobes undershoot the radial conjugate peak slightly at default scale.
        const schematicExtension = rollingRadius * 0.064;
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

/** Rotate fixed-pin disc so a lobe peak meets the engaging pin at rest. */
export function fixedPinDiscMeshPhase(pins, lobes, pinRingRadius, eccentricity) {
    const align = Math.atan2(-pinRingRadius, -eccentricity);
    // Schematic cosine lobes need a small phase bias for −θ·(N−L)/L disc spin.
    const schematicOffset = -0.036 * lobes * (pins - lobes);
    return align + schematicOffset;
}

/** Align hypocycloid cusp toward the fixed pitch circle at rest. */
export function rollingDiscMeshPhase() {
    return 0;
}

export function cycloidalDiscCenter(inputAngle, eccentricity) {
    return fixedPinDiscCenter(inputAngle, eccentricity);
}

export function cycloidalDiscMeshPhase(pins, lobes, pinRingRadius, eccentricity) {
    return fixedPinDiscMeshPhase(pins, lobes, pinRingRadius, eccentricity);
}
