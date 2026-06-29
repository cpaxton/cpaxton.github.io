/**
 * Pure kinematic laws for gear mechanisms (no canvas).
 */

import { planetaryRingTeeth } from './constraints.js';

const TAU = Math.PI * 2;

/** Gap center nearest to a contact direction on the pitch circle. */
export function gapPhaseForContact(teeth, contactWorld) {
    const pitch = TAU / teeth;
    const gapIndex = Math.floor(((contactWorld % TAU) + TAU) % TAU / pitch);
    const gapCenter = ((gapIndex + 0.5) / teeth) * TAU;
    return contactWorld - gapCenter;
}

/** Spur: driven angle from driver angle with pitch-point rolling. */
export function spurDrivenAngle(driverAngle, driverTeeth, drivenTeeth, phase = null) {
    const ratio = driverTeeth / drivenTeeth;
    const meshPhase = phase ?? gapPhaseForContact(drivenTeeth, Math.PI);
    return -ratio * driverAngle + meshPhase;
}

/** Planetary carrier output (ring fixed, sun input). */
export function planetaryCarrierAngle(sunAngle, sunTeeth, ringTeeth) {
    return (sunAngle * sunTeeth) / (sunTeeth + ringTeeth);
}

/**
 * Planet spin (Willis, ring fixed): θp = β − (Ns/Np)(θs − β) + φslot.
 * External sun–planet mesh requires the minus sign (planet counter-rotates vs sun).
 */
export function planetaryPlanetAngle(
    sunAngle,
    orbitAngle,
    sunTeeth,
    planetTeeth,
    ringTeeth,
    planetIndex = 0,
    numPlanets = 3
) {
    void ringTeeth; // retained for API symmetry; ring constraint is Ns + 2Np
    const slotAngle = (planetIndex / numPlanets) * TAU;
    const assemblyPhase = gapPhaseForContact(planetTeeth, slotAngle + Math.PI);
    return orbitAngle
        - (sunTeeth / planetTeeth) * (sunAngle - orbitAngle)
        + assemblyPhase;
}

export function planetaryPlanetAngleFromCounts(
    sunAngle,
    orbitAngle,
    sunTeeth,
    planetTeeth,
    planetIndex = 0,
    numPlanets = 3
) {
    const ringTeeth = planetaryRingTeeth(sunTeeth, planetTeeth);
    return planetaryPlanetAngle(
        sunAngle, orbitAngle, sunTeeth, planetTeeth, ringTeeth, planetIndex, numPlanets
    );
}

/** Worm wheel angle from worm rotation. */
export function wormWheelAngle(wormAngle, threads, wheelTeeth, contactWorld = -Math.PI / 2, phase = null) {
    const meshPhase = phase ?? gapPhaseForContact(wheelTeeth, contactWorld);
    return (wormAngle * threads) / wheelTeeth + meshPhase;
}

/** Cycloidal reduction ratio (fixed pins, disc output). */
export function cycloidalRatio(pins, lobes) {
    return lobes / (pins - lobes);
}

/**
 * Cycloidal motion: eccentric orbit + disc spin + output shaft.
 * Returns { orbitAngle, discSpin, outputAngle }.
 */
export function cycloidalMotion(inputAngle, pins, lobes) {
    const ratio = cycloidalRatio(pins, lobes);
    const outputAngle = inputAngle / ratio;
    const discSpin = outputAngle - inputAngle;
    return {
        orbitAngle: inputAngle,
        discSpin,
        outputAngle,
    };
}

/** Harmonic flex spline output angle. */
export function harmonicFlexAngle(generatorAngle, flexTeeth, circularTeeth) {
    return (-generatorAngle * (circularTeeth - flexTeeth)) / flexTeeth;
}

export function harmonicRatio(flexTeeth, circularTeeth) {
    return flexTeeth / (circularTeeth - flexTeeth);
}

/** Angular velocity helpers (derivatives of angle functions). */
export function spurDrivenOmega(driverOmega, driverTeeth, drivenTeeth) {
    return -(driverTeeth / drivenTeeth) * driverOmega;
}

export function planetaryCarrierOmega(sunOmega, sunTeeth, ringTeeth) {
    return (sunOmega * sunTeeth) / (sunTeeth + ringTeeth);
}
