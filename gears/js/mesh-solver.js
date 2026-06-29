/**
 * Numerical mesh alignment: pick tooth phases that yield design clearance
 * (not minimum polygon distance, which causes false overlap).
 */

import {
    meshClearanceScore,
    MIN_MESH_CLEARANCE_COEFF,
    pitchRadius,
} from './constraints.js';
import { gapPhaseForContact, planetaryCarrierAngle } from './kinematics.js';
import { externalMeshPhase, internalMeshPhase } from './profiles/involute.js';

const TAU = Math.PI * 2;

/** Subsample stride for runtime contact checks (full profiles are for drawing only). */
export const CONTACT_PROFILE_STRIDE = 6;

export function subsampleProfile(profile, stride = CONTACT_PROFILE_STRIDE) {
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

function planetRingContacts(px, py, cx = 0, cy = 0) {
    const towardPlanet = Math.atan2(py - cy, px - cx);
    return {
        planet: towardPlanet,
        ring: towardPlanet,
    };
}

function sunPlanetContacts(px, py, cx = 0, cy = 0) {
    return {
        sun: Math.atan2(py - cy, px - cx),
        planet: Math.atan2(cy - py, cx - px),
    };
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

/** Minimum clearance between a disc profile and fixed pin circles (fixed-pin cycloidal). */
export function measureCycloidalPinContact({
    discProfile,
    discX,
    discY,
    discAngle,
    housingX,
    housingY,
    pins,
    pinRadius,
}) {
    const discLite = subsampleProfile(discProfile, 3);
    const worldDisc = worldPoints(discLite, discX, discY, discAngle);
    const engageThreshold = pinRadius * 0.85;
    let best = {
        clearance: Infinity,
        pointA: null,
        pointB: null,
        label: '',
        engaged: false,
    };

    for (let pi = 0; pi < pins.length; pi++) {
        const pcx = housingX + pins[pi].x;
        const pcy = housingY + pins[pi].y;

        for (const p of worldDisc) {
            const dx = p.x - pcx;
            const dy = p.y - pcy;
            const dist = Math.hypot(dx, dy);
            const clearance = dist - pinRadius;
            if (clearance < best.clearance) {
                const onPin = dist > 1e-9 ? dist : 1;
                best = {
                    clearance,
                    pointA: p,
                    pointB: {
                        x: pcx + (dx / onPin) * pinRadius,
                        y: pcy + (dy / onPin) * pinRadius,
                    },
                    label: `Disc–pin ${pi + 1}`,
                    engaged: false,
                };
            }
        }
    }

    best.engaged = best.clearance <= engageThreshold;
    return best;
}

/** Clearance between flex spline and circular ring at both mesh zones. */
export function measureHarmonicContact({
    flexProfile,
    ringProfile,
    cx,
    cy,
    generatorAngle,
}) {
    const flexLite = subsampleProfile(flexProfile, 5);
    const ringLite = subsampleProfile(ringProfile, 8);
    let worst = { clearance: Infinity, pointA: null, pointB: null, label: '' };

    for (const offset of [0, Math.PI]) {
        const zone = generatorAngle + offset;
        const pair = minContactPair(
            flexLite, cx, cy, 0,
            ringLite, cx, cy, 0,
            zone, zone,
            0.48
        );
        if (pair.clearance < worst.clearance) {
            worst = {
                ...pair,
                label: offset === 0 ? 'Flex–ring mesh A' : 'Flex–ring mesh B',
            };
        }
    }

    return worst;
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

        const sunContacts = sunPlanetContacts(px, py, cx, cy);
        const sunPair = minContactPair(
            sunProfile, cx, cy, sunAngle,
            planetProfile, px, py, spin,
            sunContacts.sun, sunContacts.planet
        );
        if (sunPair.clearance < worst.clearance) {
            worst = { ...sunPair, label: `Sun–planet ${p + 1}` };
        }

        const ringContacts = planetRingContacts(px, py, cx, cy);
        const ringPair = minContactPair(
            planetProfile, px, py, spin,
            ringProfile, cx, cy, ringPhase,
            ringContacts.planet, ringContacts.ring
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
        let worstSun = Infinity;
        let worstRing = Infinity;

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
                const sunContacts = sunPlanetContacts(px, py);
                const ringContacts = planetRingContacts(px, py);

                worstSun = Math.min(
                    worstSun,
                    minContactDistance(
                        sunLite, 0, 0, sunAngle,
                        planetLite, px, py, spin,
                        sunContacts.sun, sunContacts.planet
                    )
                );
                worstRing = Math.min(
                    worstRing,
                    minContactDistance(
                        planetLite, px, py, spin,
                        ringLite, 0, 0, ringPhase,
                        ringContacts.planet, ringContacts.ring
                    )
                );
            }
        }

        return { worstSun, worstRing, combined: Math.min(worstSun, worstRing) };
    }

    function assemblyScore(clearances) {
        const min = MIN_MESH_CLEARANCE_COEFF * module;
        const { worstSun, worstRing } = clearances;
        if (worstSun < min || worstRing < min) {
            return 100 + (min - Math.min(worstSun, worstRing)) * 20;
        }
        return Math.max(
            meshClearanceScore(worstSun, module),
            meshClearanceScore(worstRing, module)
        );
    }

    const sunSamples = Array.from({ length: 12 }, (_, i) => (i / 12) * TAU);
    const baseRing = internalMeshPhase(ringTeeth, 0);
    const ringStep = TAU / ringTeeth;
    const planetStep = TAU / planetTeeth;
    let best = {
        score: Infinity,
        ringPhase: baseRing,
        planetOffsets,
        clearance: Infinity,
        sunClearance: Infinity,
        ringClearance: Infinity,
    };

    for (let k = 0; k < coarseRingSteps; k++) {
        const ringPhase = wrapAngle(baseRing + k * ringStep);
        let trialOffsets = [...planetOffsets];
        let clearances = assemblyClearance(ringPhase, trialOffsets, sunSamples);
        let localScore = assemblyScore(clearances);

        for (let p = 0; p < numPlanets; p++) {
            let bestTrial = trialOffsets[p];
            for (let d = -4; d <= 4; d++) {
                const trial = [...trialOffsets];
                trial[p] = trialOffsets[p] + d * planetStep;
                const next = assemblyClearance(ringPhase, trial, sunSamples);
                const score = assemblyScore(next);
                if (score < localScore) {
                    localScore = score;
                    bestTrial = trial[p];
                    clearances = next;
                }
            }
            trialOffsets[p] = wrapAngle(bestTrial);
        }

        if (localScore < best.score) {
            best = {
                score: localScore,
                ringPhase,
                planetOffsets: trialOffsets.map((offset) => wrapAngle(offset)),
                clearance: clearances.combined,
                sunClearance: clearances.worstSun,
                ringClearance: clearances.worstRing,
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

            const sunContacts = sunPlanetContacts(px, py);
            const ringContacts = planetRingContacts(px, py);
            const dSun = minContactDistance(
                sunProfile, 0, 0, sunAngle,
                planetProfile, px, py, spin,
                sunContacts.sun, sunContacts.planet
            );
            const dRing = minContactDistance(
                planetProfile, px, py, spin,
                ringProfile, 0, 0, ringPhase,
                ringContacts.planet, ringContacts.ring
            );
            worst = Math.min(worst, dSun, dRing);
        }
    }

    return worst;
}
