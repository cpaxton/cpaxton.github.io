/**
 * Numerical mesh alignment: pick tooth phases that yield design clearance
 * (not minimum polygon distance, which causes false overlap).
 */

import {
    meshClearanceScore,
    pitchRadius,
} from './constraints.js';
import { gapPhaseForContact, planetaryCarrierAngle } from './kinematics.js';
import { externalMeshPhase, internalMeshPhase } from './profiles/involute.js';

const TAU = Math.PI * 2;

function subsampleProfile(profile, stride = 5) {
    if (profile.length <= 48) return profile;
    return profile.filter((_, index) => index % stride === 0);
}

function wrapAngle(angle) {
    return ((angle % TAU) + TAU) % TAU;
}

function angleDiff(a, b) {
    let d = wrapAngle(a - b);
    if (d > Math.PI) d -= TAU;
    return Math.abs(d);
}

function worldPoints(local, x, y, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return local.map((p) => ({
        x: x + p.x * c - p.y * s,
        y: y + p.x * s + p.y * c,
    }));
}

/**
 * Minimum distance between profile samples near the mesh point on the line of centers.
 */
export function minContactDistance(
    profileA,
    xA,
    yA,
    angleA,
    profileB,
    xB,
    yB,
    angleB,
    contactFromA,
    contactFromB,
    halfAngle = 0.38
) {
    const ptsA = worldPoints(profileA, xA, yA, angleA);
    const ptsB = worldPoints(profileB, xB, yB, angleB);
    let min = Infinity;

    for (const a of ptsA) {
        const dirA = Math.atan2(a.y - yA, a.x - xA);
        if (angleDiff(dirA, contactFromA) > halfAngle) continue;
        for (const b of ptsB) {
            const dirB = Math.atan2(b.y - yB, b.x - xB);
            if (angleDiff(dirB, contactFromB) > halfAngle) continue;
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < min) min = d;
        }
    }

    return min;
}

/** Like minContactDistance but returns the closest point pair. */
export function minContactPair(
    profileA,
    xA,
    yA,
    angleA,
    profileB,
    xB,
    yB,
    angleB,
    contactFromA,
    contactFromB,
    halfAngle = 0.38
) {
    const ptsA = worldPoints(profileA, xA, yA, angleA);
    const ptsB = worldPoints(profileB, xB, yB, angleB);
    let min = Infinity;
    let pointA = null;
    let pointB = null;

    for (const a of ptsA) {
        const dirA = Math.atan2(a.y - yA, a.x - xA);
        if (angleDiff(dirA, contactFromA) > halfAngle) continue;
        for (const b of ptsB) {
            const dirB = Math.atan2(b.y - yB, b.x - xB);
            if (angleDiff(dirB, contactFromB) > halfAngle) continue;
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < min) {
                min = d;
                pointA = a;
                pointB = b;
            }
        }
    }

    return { clearance: min, pointA, pointB };
}

export function measureSpurContact({
    driverProfile,
    drivenProfile,
    driverX,
    driverY,
    drivenX,
    drivenY,
    driverAngle,
    drivenAngle,
}) {
    const contactDriver = Math.atan2(drivenY - driverY, drivenX - driverX);
    const contactDriven = Math.atan2(driverY - drivenY, driverX - drivenX);
    return minContactPair(
        driverProfile, driverX, driverY, driverAngle,
        drivenProfile, drivenX, drivenY, drivenAngle,
        contactDriver, contactDriven
    );
}

export function measurePlanetaryContacts({
    sunProfile,
    planetProfile,
    ringProfile,
    sunTeeth,
    planetTeeth,
    ringTeeth,
    ringPhase,
    planetOffsets,
    sunAngle,
    cx,
    cy,
    orbitR,
    numPlanets = 3,
    planetSpins = null,
}) {
    const carrier = planetaryCarrierAngle(sunAngle, sunTeeth, ringTeeth);
    let worst = { clearance: Infinity, pointA: null, pointB: null, label: '' };

    for (let p = 0; p < numPlanets; p++) {
        const slot = (p / numPlanets) * TAU;
        const beta = carrier + slot;
        const px = cx + Math.cos(beta) * orbitR;
        const py = cy + Math.sin(beta) * orbitR;
        const spin = planetSpins
            ? planetSpins[p]
            : planetaryPlanetAngleWithOffset(sunAngle, beta, sunTeeth, planetTeeth, planetOffsets[p]);

        const sunPair = minContactPair(
            sunProfile, cx, cy, sunAngle,
            planetProfile, px, py, spin,
            Math.atan2(py - cy, px - cx), Math.atan2(cy - py, cx - px)
        );
        if (sunPair.clearance < worst.clearance) {
            worst = { ...sunPair, label: `Sun–planet ${p + 1}` };
        }

        const ringPair = minContactPair(
            planetProfile, px, py, spin,
            ringProfile, cx, cy, ringPhase,
            Math.atan2(py - cy, px - cx), Math.atan2(py - cy, px - cx)
        );
        if (ringPair.clearance < worst.clearance) {
            worst = { ...ringPair, label: `Planet ${p + 1}–ring` };
        }
    }

    return worst;
}

function worstSpurClearance({
    driverProfile,
    drivenProfile,
    driverX,
    driverY,
    drivenX,
    drivenY,
    driverTeeth,
    drivenTeeth,
    drivenPhase,
    samples = 8,
}) {
    const contactDriver = Math.atan2(drivenY - driverY, drivenX - driverX);
    const contactDriven = Math.atan2(driverY - drivenY, driverX - drivenX);
    const ratio = driverTeeth / drivenTeeth;
    let worst = Infinity;

    for (let s = 0; s < samples; s++) {
        const driverAngle = (s / samples) * TAU / 4;
        const drivenAngle = -ratio * driverAngle + drivenPhase;
        worst = Math.min(
            worst,
            minContactDistance(
                driverProfile, driverX, driverY, driverAngle,
                drivenProfile, drivenX, drivenY, drivenAngle,
                contactDriver, contactDriven
            )
        );
    }

    return worst;
}

/** Spur pair: kinematic rolling + tooth-index search for design clearance. */
export function solveSpurAssembly({
    driverProfile,
    drivenProfile,
    driverX,
    driverY,
    drivenX,
    drivenY,
    driverTeeth,
    drivenTeeth,
    module = 1,
}) {
    const contactDriven = Math.atan2(driverY - drivenY, driverX - drivenX);
    const driverLite = subsampleProfile(driverProfile, 4);
    const drivenLite = subsampleProfile(drivenProfile, 4);
    const basePhase = externalMeshPhase(drivenTeeth, contactDriven);
    const toothStep = TAU / drivenTeeth;

    let bestPhase = basePhase;
    let bestClearance = Infinity;
    let bestScore = Infinity;

    for (let k = 0; k < drivenTeeth; k++) {
        const candidate = basePhase + k * toothStep;
        const clearance = worstSpurClearance({
            driverProfile: driverLite,
            drivenProfile: drivenLite,
            driverX,
            driverY,
            drivenX,
            drivenY,
            driverTeeth,
            drivenTeeth,
            drivenPhase: candidate,
        });
        const score = meshClearanceScore(clearance, module);
        if (score < bestScore) {
            bestScore = score;
            bestPhase = candidate;
            bestClearance = clearance;
        }
    }

    const ratio = driverTeeth / drivenTeeth;
    return {
        drivenPhase: bestPhase,
        clearance: bestClearance,
        anglesAt(driverAngle) {
            return {
                driver: driverAngle,
                driven: -ratio * driverAngle + bestPhase,
            };
        },
    };
}

/** Kinematic assembly offset for a planet in carrier slot `slot`. */
export function kinematicPlanetOffset(planetTeeth, slot) {
    return gapPhaseForContact(planetTeeth, slot + Math.PI);
}

/**
 * Planetary assembly at sun angle 0 / carrier 0.
 * Planet spins follow Willis + kinematic gap phase; ring phase is searched.
 */
export function solvePlanetaryAssembly({
    sunProfile,
    planetProfile,
    ringProfile,
    sunTeeth,
    planetTeeth,
    ringTeeth,
    numPlanets = 3,
    module = 1,
    coarseRingSteps = 36,
}) {
    const sunLite = subsampleProfile(sunProfile);
    const planetLite = subsampleProfile(planetProfile);
    const ringLite = subsampleProfile(ringProfile);
    const sunR = pitchRadius(sunTeeth, module);
    const planetR = pitchRadius(planetTeeth, module);
    const orbitR = sunR + planetR;

    const planetOffsets = Array.from({ length: numPlanets }, (_, p) => {
        const slot = (p / numPlanets) * TAU;
        return kinematicPlanetOffset(planetTeeth, slot);
    });

    function assemblyClearance(ringPhase, offsets, sunAngles) {
        let worst = Infinity;
        for (const sunAngle of sunAngles) {
            const carrier = planetaryCarrierAngle(sunAngle, sunTeeth, ringTeeth);
            for (let p = 0; p < numPlanets; p++) {
                const slot = (p / numPlanets) * TAU;
                const beta = carrier + slot;
                const px = Math.cos(beta) * orbitR;
                const py = Math.sin(beta) * orbitR;
                const spin = planetaryPlanetAngleWithOffset(
                    sunAngle, beta, sunTeeth, planetTeeth, offsets[p]
                );
                const sunContact = Math.atan2(py, px);
                const planetSunContact = Math.atan2(-py, -px);
                const planetRingContact = Math.atan2(py, px);
                const ringContact = Math.atan2(py, px);

                worst = Math.min(
                    worst,
                    minContactDistance(
                        sunLite, 0, 0, sunAngle,
                        planetLite, px, py, spin,
                        sunContact, planetSunContact
                    ),
                    minContactDistance(
                        planetLite, px, py, spin,
                        ringLite, 0, 0, ringPhase,
                        planetRingContact, ringContact
                    )
                );
            }
        }
        return worst;
    }

    const sunSamples = Array.from({ length: 12 }, (_, i) => (i / 12) * TAU);
    const baseRing = internalMeshPhase(ringTeeth, 0);
    const ringStep = TAU / ringTeeth;
    const planetStep = TAU / planetTeeth;
    let best = { score: Infinity, ringPhase: baseRing, planetOffsets, clearance: Infinity };

    for (let k = 0; k < coarseRingSteps; k++) {
        const ringPhase = wrapAngle(baseRing + k * ringStep);
        let trialOffsets = [...planetOffsets];
        let bestLocal = assemblyClearance(ringPhase, trialOffsets, sunSamples);
        let localScore = meshClearanceScore(bestLocal, module);

        for (let p = 0; p < numPlanets; p++) {
            let bestTrial = trialOffsets[p];
            for (let d = -2; d <= 2; d++) {
                const trial = [...trialOffsets];
                trial[p] = trialOffsets[p] + d * planetStep;
                const clearance = assemblyClearance(ringPhase, trial, sunSamples);
                const score = meshClearanceScore(clearance, module);
                if (score < localScore) {
                    localScore = score;
                    bestTrial = trial[p];
                    bestLocal = clearance;
                }
            }
            trialOffsets[p] = wrapAngle(bestTrial);
        }

        if (localScore < best.score) {
            best = {
                score: localScore,
                ringPhase,
                planetOffsets: trialOffsets.map((offset) => wrapAngle(offset)),
                clearance: bestLocal,
            };
        }
    }

    return best;
}

export function planetaryPlanetAngleWithOffset(
    sunAngle,
    orbitAngle,
    sunTeeth,
    planetTeeth,
    assemblyOffset
) {
    return orbitAngle
        - (sunTeeth / planetTeeth) * (sunAngle - orbitAngle)
        + assemblyOffset;
}

/** Sample worst contact clearance over one animation cycle (module-normalized geometry). */
export function samplePlanetaryClearance({
    sunProfile,
    planetProfile,
    ringProfile,
    sunTeeth,
    planetTeeth,
    ringTeeth,
    ringPhase,
    planetOffsets,
    numPlanets = 3,
    steps = 80,
    module = 1,
}) {
    const sunR = pitchRadius(sunTeeth, module);
    const planetR = pitchRadius(planetTeeth, module);
    const orbitR = sunR + planetR;
    let worst = Infinity;

    for (let step = 0; step <= steps; step++) {
        const sunAngle = (step / steps) * TAU;
        const carrier = planetaryCarrierAngle(sunAngle, sunTeeth, ringTeeth);

        for (let p = 0; p < numPlanets; p++) {
            const slot = (p / numPlanets) * TAU;
            const beta = carrier + slot;
            const px = Math.cos(beta) * orbitR;
            const py = Math.sin(beta) * orbitR;
            const spin = planetaryPlanetAngleWithOffset(
                sunAngle, beta, sunTeeth, planetTeeth, planetOffsets[p]
            );

            const dSun = minContactDistance(
                sunProfile, 0, 0, sunAngle,
                planetProfile, px, py, spin,
                Math.atan2(py, px), Math.atan2(-py, -px)
            );
            const dRing = minContactDistance(
                planetProfile, px, py, spin,
                ringProfile, 0, 0, ringPhase,
                Math.atan2(py, px), Math.atan2(py, px)
            );
            worst = Math.min(worst, dSun, dRing);
        }
    }

    return worst;
}
