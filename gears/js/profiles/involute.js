/**
 * Involute gear profile generation (external + internal).
 */

import {
    ADDENDUM_COEFF,
    DEDENDUM_COEFF,
    DEFAULT_PRESSURE_ANGLE,
    pitchRadius,
} from '../constraints.js';
import { gapPhaseForContact } from '../kinematics.js';

const TAU = Math.PI * 2;

export function baseRadius(pitchR, pressureAngle = DEFAULT_PRESSURE_ANGLE) {
    return pitchR * Math.cos(pressureAngle);
}

export function involutePoint(baseR, t) {
    return {
        x: baseR * (Math.cos(t) + t * Math.sin(t)),
        y: baseR * (Math.sin(t) - t * Math.cos(t)),
    };
}

export function rollAngleForRadius(baseR, radius) {
    if (radius <= baseR) return 0;
    return Math.sqrt((radius / baseR) ** 2 - 1);
}

function rotatePoint(p, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

function polarPoint(radius, angle) {
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

/** Involute polar form: radius and roll angle θ = t − atan(t). */
function involutePolar(baseR, t) {
    const radius = baseR * Math.hypot(1, t);
    const theta = t - Math.atan(t);
    return { radius, theta };
}

/** Circular arc along constant radius (avoids chord shortcuts that bend tooth roots). */
function sampleRootArc(radius, startAngle, endAngle, segments = 10) {
    const pts = [];
    for (let i = 1; i <= segments; i++) {
        const a = startAngle + (i / segments) * (endAngle - startAngle);
        pts.push(polarPoint(radius, a));
    }
    return pts;
}

/** One tooth segment for external gear (local frame, tooth peak at angle 0). */
function externalToothSegment(
    teeth,
    module,
    pressureAngle = DEFAULT_PRESSURE_ANGLE,
    addendumCoeff = ADDENDUM_COEFF
) {
    const r = pitchRadius(teeth, module);
    const rb = baseRadius(r, pressureAngle);
    const ra = r + addendumCoeff * module;
    const rf = Math.max(rb, r - DEDENDUM_COEFF * module);
    const pitch = TAU / teeth;
    const halfTooth = pitch / 4;
    const tMax = rollAngleForRadius(rb, ra);
    const tMin = rollAngleForRadius(rb, rf);
    const pts = [];

    for (let i = 0; i <= 24; i++) {
        const t = tMin + (i / 24) * (tMax - tMin);
        const { radius, theta } = involutePolar(rb, t);
        pts.push(polarPoint(radius, -halfTooth + theta));
    }

    let rightFootAngle = halfTooth;
    for (let i = 24; i >= 0; i--) {
        const t = tMin + (i / 24) * (tMax - tMin);
        const { radius, theta } = involutePolar(rb, t);
        const angle = halfTooth - theta;
        if (i === 0) rightFootAngle = angle;
        pts.push(polarPoint(radius, angle));
    }

    const rootEnd = pitch - halfTooth;
    if (rightFootAngle < rootEnd) {
        pts.push(...sampleRootArc(rf, rightFootAngle, rootEnd, 10));
    } else {
        pts.push(...sampleRootArc(rf, rightFootAngle, rootEnd + pitch, 10));
    }

    return pts;
}

/** Closed polygon path for a full external gear. */
export function sampleExternalGear(teeth, module, pressureAngle = DEFAULT_PRESSURE_ANGLE) {
    const pitch = TAU / teeth;
    const tooth = externalToothSegment(teeth, module, pressureAngle);
    const path = [];
    for (let i = 0; i < teeth; i++) {
        for (const p of tooth) {
            path.push(rotatePoint(p, i * pitch));
        }
    }
    return path;
}

/** Slightly undersize external teeth for visible backlash at pitch. */
export function scaleGearProfile(profile, scale) {
    return profile.map((p) => ({ x: p.x * scale, y: p.y * scale }));
}

/** Conjugate internal tooth profile via pitch-circle mirror of an external gear. */
function sampleInternalToothProfile(teeth, module, pressureAngle = DEFAULT_PRESSURE_ANGLE) {
    const external = sampleExternalGear(teeth, module, pressureAngle);
    const r = pitchRadius(teeth, module);
    const pitch = TAU / teeth;
    const ringBacklash = 0.075 * module;
    return external.map((p) => {
        const radius = Math.hypot(p.x, p.y);
        const angle = Math.atan2(p.y, p.x);
        return polarPoint(2 * r - radius + ringBacklash, angle);
    }).map((p) => rotatePoint(p, pitch / 2));
}

/** Internal ring gear as a filled annulus with inward-pointing teeth. */
export function sampleInternalGear(teeth, module, pressureAngle = DEFAULT_PRESSURE_ANGLE) {
    const r = pitchRadius(teeth, module);
    const outerR = r + DEDENDUM_COEFF * module + module * 0.5;
    const inner = sampleInternalToothProfile(teeth, module, pressureAngle);
    const path = [];
    const outerSegs = 72;

    for (let i = 0; i <= outerSegs; i++) {
        path.push(polarPoint(outerR, (i / outerSegs) * TAU));
    }
    for (let i = inner.length - 1; i >= 0; i--) {
        path.push(inner[i]);
    }
    return path;
}

/** Initial rotation for a fixed internal ring meshing with planets at `contactWorld`. */
export function internalMeshPhase(teeth, contactWorld = 0) {
    return Math.PI + gapPhaseForContact(teeth, contactWorld);
}

export function externalMeshPhase(drivenTeeth, contactWorld = Math.PI) {
    return gapPhaseForContact(drivenTeeth, contactWorld);
}

export function spurMeshAngles(driverAngle, driverTeeth, drivenTeeth) {
    const phase = externalMeshPhase(drivenTeeth, Math.PI);
    const ratio = driverTeeth / drivenTeeth;
    return {
        driver: driverAngle,
        driven: -ratio * driverAngle + phase,
        phase,
    };
}

export { gapPhaseForContact };
