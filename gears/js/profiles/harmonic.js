/**
 * Harmonic drive flex/circular spline profiles.
 */

import { DEFAULT_PRESSURE_ANGLE, pitchRadius } from '../constraints.js';
import { sampleExternalGear, sampleInternalGear } from './involute.js';

const TAU = Math.PI * 2;

export function harmonicWaveRadii(flexRadius, flexTeeth, circularTeeth) {
    const toothDelta = circularTeeth - flexTeeth;
    const amplitude = flexRadius * (toothDelta / flexTeeth) * 0.45;
    return {
        major: flexRadius + amplitude,
        minor: flexRadius - amplitude,
        amplitude,
        toothDelta,
    };
}

/** Flex spline outline deformed by 2-wave generator. */
export function sampleFlexSpline(
    flexTeeth,
    module,
    generatorAngle,
    flexAngle,
    pressureAngle = DEFAULT_PRESSURE_ANGLE
) {
    const flexR = pitchRadius(flexTeeth, module);
    const { major, minor } = harmonicWaveRadii(flexR, flexTeeth, flexTeeth + 2);
    const points = 120;
    const path = [];

    for (let i = 0; i <= points; i++) {
        const t = (i / points) * TAU;
        const wave = Math.cos(2 * t - 2 * generatorAngle);
        const r = wave >= 0 ? major : minor;
        const a = t + flexAngle;
        path.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }

    return path;
}

/** Flex teeth as short outward stubs on deformed circle. */
export function sampleFlexTeeth(
    flexTeeth,
    module,
    generatorAngle,
    flexAngle,
    pressureAngle = DEFAULT_PRESSURE_ANGLE
) {
    const flexR = pitchRadius(flexTeeth, module);
    const { major, minor } = harmonicWaveRadii(flexR, flexTeeth, flexTeeth + 2);
    const pitch = TAU / flexTeeth;
    const teeth = [];

    for (let i = 0; i < flexTeeth; i++) {
        const t = i * pitch + flexAngle;
        const wave = Math.cos(2 * (i * pitch) - 2 * generatorAngle);
        const r = wave >= 0 ? major : minor;
        const half = pitch * 0.12;
        teeth.push([
            { x: Math.cos(t - half) * r, y: Math.sin(t - half) * r },
            { x: Math.cos(t) * (r + module * 0.8), y: Math.sin(t) * (r + module * 0.8) },
            { x: Math.cos(t + half) * r, y: Math.sin(t + half) * r },
        ]);
    }

    return teeth;
}

/** Circular spline uses internal involute ring. */
export function sampleCircularSpline(circularTeeth, module, pressureAngle = DEFAULT_PRESSURE_ANGLE) {
    return sampleInternalGear(circularTeeth, module, pressureAngle);
}

/** External reference for flex tooth spacing. */
export function sampleFlexReference(flexTeeth, module) {
    return sampleExternalGear(flexTeeth, module);
}
