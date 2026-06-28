/**
 * Worm and worm-wheel geometry (2D normal-section schematic).
 */

import { DEFAULT_PRESSURE_ANGLE, pitchRadius } from '../constraints.js';
import { gapPhaseForContact } from '../kinematics.js';
import { sampleExternalGear } from './involute.js';

const TAU = Math.PI * 2;

export function wormGeometry(wheelTeeth, module, threads = 1, leadAngleDeg = 15) {
    const wheelR = pitchRadius(wheelTeeth, module);
    const leadAngle = (leadAngleDeg * Math.PI) / 180;
    const axialPitch = Math.PI * module;
    const wormPitchRadius = wheelR / threads;
    const contactY = -wheelR;
    return {
        wheelR,
        wormPitchRadius,
        axialPitch,
        leadAngle,
        contactY,
        module,
    };
}

/** Worm thread profile in normal plane (helical section projected). */
export function sampleWormProfile(length, threads, wormAngle, amplitude = 6) {
    const wavelength = length / (1.5 + threads);
    const pts = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * length - length / 2;
        const wave = Math.sin((t / wavelength) * TAU * threads + wormAngle) * amplitude;
        pts.push({ x: t, y: wave });
    }
    pts.push({ x: length / 2, y: amplitude + 10 });
    pts.push({ x: -length / 2, y: amplitude + 10 });
    return pts;
}

export function wormWheelAngle(wormAngle, threads, wheelTeeth, contactWorld = -Math.PI / 2) {
    const phase = gapPhaseForContact(wheelTeeth, contactWorld);
    return (wormAngle * threads) / wheelTeeth + phase;
}

export function sampleWormWheel(wheelTeeth, module, pressureAngle) {
    return sampleExternalGear(wheelTeeth, module, pressureAngle);
}
