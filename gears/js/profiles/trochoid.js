/**
 * Cycloidal (trochoid) disc, pin layout, and rolling hypocycloid geometry.
 */

import { cycloidalRatio } from '../kinematics.js';

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
 * Fixed-pin disc: outward lobes that reach the pin circle when eccentrically offset.
 */
export function sampleFixedPinDisc(discRadius, lobes, rollingRadius, points = 180) {
    const valleyR = discRadius - rollingRadius * 0.88;
    const peakR = discRadius;
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

/** Rotate fixed-pin disc so a lobe peak meets the top pin at rest. */
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
