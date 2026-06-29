/**
 * Harmonic drive flex/circular spline profiles.
 */

import { DEFAULT_PRESSURE_ANGLE, pitchRadius } from '../constraints.js';
import { sampleExternalGear, sampleInternalGear } from './involute.js';

const TAU = Math.PI * 2;

/** Radius of a rotated ellipse at polar angle `angle` (semi-axes a ≥ b, major axis at phi). */
export function ellipseRadiusAt(angle, a, b, phi) {
    const t = angle - phi;
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    return (a * b) / Math.hypot(b * cos, a * sin);
}

/** Radial major/minor semi-axes for the 2-wave flex spline deformation. */
export function harmonicWaveRadii(flexRadius, flexTeeth, circularTeeth) {
    const toothDelta = circularTeeth - flexTeeth;
    const ringRadius = flexRadius * (circularTeeth / flexTeeth);
    const amplitude = Math.max(
        (ringRadius - flexRadius) * 0.92,
        flexRadius * (toothDelta / flexTeeth) * 0.5
    );
    return {
        major: flexRadius + amplitude,
        minor: flexRadius - amplitude,
        amplitude,
        toothDelta,
        ringRadius,
    };
}

/** Elliptical wave generator cam (coaxial, rotates in place). */
export function waveGeneratorRadii(flexRadius, flexTeeth, circularTeeth, module) {
    const { minor } = harmonicWaveRadii(flexRadius, flexTeeth, circularTeeth);
    const major = Math.max(minor - module * 1.4, minor * 0.5);
    return {
        major,
        minor: major * 0.58,
    };
}

/**
 * Map an unstressed flex-spline point onto the strained ellipse in housing coordinates.
 * Strain field is fixed to the wave generator; the tooth pattern rotates with flexAngle.
 */
export function deformFlexPoint(
    point,
    flexRadius,
    major,
    minor,
    generatorAngle,
    flexAngle
) {
    const thetaMaterial = Math.atan2(point.y, point.x);
    const toothOffset = Math.hypot(point.x, point.y) - flexRadius;
    const thetaHousing = thetaMaterial + flexAngle;
    const r =
        ellipseRadiusAt(thetaHousing, major, minor, generatorAngle) + toothOffset;
    return {
        x: Math.cos(thetaHousing) * r,
        y: Math.sin(thetaHousing) * r,
    };
}

function waveParams(flexTeeth, module, circularTeeth) {
    const flexR = pitchRadius(flexTeeth, module);
    const wave = harmonicWaveRadii(flexR, flexTeeth, circularTeeth);
    return { flexR, ...wave };
}

/** Flex spline outer profile: full involute teeth on the strained ellipse. */
export function sampleFlexSpline(
    flexTeeth,
    module,
    generatorAngle,
    flexAngle,
    circularTeeth,
    pressureAngle = DEFAULT_PRESSURE_ANGLE
) {
    const { flexR, major, minor } = waveParams(flexTeeth, module, circularTeeth);
    const base = sampleExternalGear(flexTeeth, module, pressureAngle);

    return base.map((p) =>
        deformFlexPoint(p, flexR, major, minor, generatorAngle, flexAngle)
    );
}

/** Inner bore pressed against the wave generator bearing (co-rotates with flex output). */
export function sampleFlexInnerBore(
    flexTeeth,
    module,
    generatorAngle,
    flexAngle,
    circularTeeth
) {
    const gen = waveGeneratorRadii(
        pitchRadius(flexTeeth, module),
        flexTeeth,
        circularTeeth,
        module
    );
    const pad = module * 0.38;
    const a = gen.major + pad;
    const b = gen.minor + pad;
    const phi = generatorAngle + flexAngle;
    const points = 96;
    const path = [];

    for (let i = 0; i <= points; i++) {
        const u = (i / points) * TAU;
        const r = ellipseRadiusAt(u, a, b, phi);
        path.push({ x: Math.cos(u) * r, y: Math.sin(u) * r });
    }

    return path;
}

/** Closed annulus: outer involute teeth + inner bore (shows real tooth roots on the cup wall). */
export function sampleFlexAnnulus(
    flexTeeth,
    module,
    generatorAngle,
    flexAngle,
    circularTeeth,
    pressureAngle = DEFAULT_PRESSURE_ANGLE
) {
    const outer = sampleFlexSpline(
        flexTeeth,
        module,
        generatorAngle,
        flexAngle,
        circularTeeth,
        pressureAngle
    );
    const inner = sampleFlexInnerBore(
        flexTeeth,
        module,
        generatorAngle,
        flexAngle,
        circularTeeth
    );
    return [...outer, ...inner.slice().reverse()];
}

/** Per-tooth polylines (deformed involute segments) for highlight strokes. */
export function sampleFlexToothOutlines(
    flexTeeth,
    module,
    generatorAngle,
    flexAngle,
    circularTeeth,
    pressureAngle = DEFAULT_PRESSURE_ANGLE
) {
    const { flexR, major, minor } = waveParams(flexTeeth, module, circularTeeth);
    const unstressed = sampleExternalGear(flexTeeth, module, pressureAngle);
    const perTooth = Math.floor(unstressed.length / flexTeeth);
    const outlines = [];

    for (let i = 0; i < flexTeeth; i++) {
        const start = i * perTooth;
        const segment = unstressed.slice(start, start + perTooth);
        outlines.push(
            segment.map((p) =>
                deformFlexPoint(p, flexR, major, minor, generatorAngle, flexAngle)
            )
        );
    }

    return outlines;
}

/** Circular spline uses internal involute ring. */
export function sampleCircularSpline(circularTeeth, module, pressureAngle = DEFAULT_PRESSURE_ANGLE) {
    return sampleInternalGear(circularTeeth, module, pressureAngle);
}

/** External reference for flex tooth spacing. */
export function sampleFlexReference(flexTeeth, module) {
    return sampleExternalGear(flexTeeth, module);
}

/** @deprecated Use sampleFlexSpline / sampleFlexAnnulus. */
export function sampleFlexTeeth(
    flexTeeth,
    module,
    generatorAngle,
    flexAngle,
    circularTeeth = flexTeeth + 2,
    pressureAngle = DEFAULT_PRESSURE_ANGLE
) {
    return sampleFlexToothOutlines(
        flexTeeth,
        module,
        generatorAngle,
        flexAngle,
        circularTeeth,
        pressureAngle
    );
}
