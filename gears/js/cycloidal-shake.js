/**
 * Cycloidal eccentric mass / housing shake from disc profile centroids.
 */

import {
    fixedPinDiscCenter,
    rollingDiscCenter,
    rollingCircleSpin,
    rollingDiscMeshPhase,
} from './profiles/trochoid.js';

function worldProfileCentroid(profile, center, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    let sx = 0;
    let sy = 0;
    for (const p of profile) {
        sx += center.x + p.x * c - p.y * s;
        sy += center.y + p.x * s + p.y * c;
    }
    const n = profile.length || 1;
    return { x: sx / n, y: sy / n };
}

function counterDiscAngleOffset(phaseOffset, lobes) {
    if (phaseOffset === 0) return 0;
    return lobes % 2 === 0 ? 0 : phaseOffset;
}

function fixedPinPose(motion, geom, meshPhase, phaseOffset) {
    const orbit = motion.orbitAngle + phaseOffset;
    return {
        center: fixedPinDiscCenter(orbit, geom.fixedPinEccentricity),
        angle: motion.fixedPinDiscAngle + meshPhase + phaseOffset,
    };
}

function rollingPose(motion, geom, lobes, phaseOffset) {
    const orbit = motion.orbitAngle + phaseOffset;
    const rollSpin = rollingCircleSpin(orbit, lobes);
    return {
        center: rollingDiscCenter(orbit, geom.hypocycloidOrbit),
        angle: rollSpin + rollingDiscMeshPhase() + counterDiscAngleOffset(phaseOffset, lobes),
    };
}

/**
 * Net mass offset from housing center (px, disc-local frame).
 * Equal-mass dual disc: average of both centroids.
 */
export function cycloidalMassShake({
    profile,
    meshPhase,
    motion,
    geom,
    lobes,
    counterDisc,
    variant = 'fixed-pin',
}) {
    const pose = variant === 'rolling'
        ? (phase) => rollingPose(motion, geom, lobes, phase)
        : (phase) => fixedPinPose(motion, geom, meshPhase, phase);

    const primary = pose(0);
    const com1 = worldProfileCentroid(profile, primary.center, primary.angle);

    if (!counterDisc) {
        return { wobble: com1, primaryCenter: primary.center };
    }

    const counter = pose(Math.PI);
    const com2 = worldProfileCentroid(profile, counter.center, counter.angle);
    return {
        wobble: { x: (com1.x + com2.x) / 2, y: (com1.y + com2.y) / 2 },
        primaryCenter: primary.center,
    };
}
