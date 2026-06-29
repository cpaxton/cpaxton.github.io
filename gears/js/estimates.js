/**
 * Order-of-magnitude weight and cost heuristics for ~100–200 mm-class reducers.
 * Not quotes — useful for comparing mechanism families at similar torque scale.
 */

export function formatEstimate(weightKg, costUsd) {
    const weight = weightKg >= 1
        ? `${weightKg.toFixed(1)} kg`
        : `${Math.round(weightKg * 1000)} g`;
    let cost;
    if (costUsd >= 10000) {
        cost = `~$${Math.round(costUsd / 1000)}k`;
    } else if (costUsd >= 1000) {
        cost = `~$${(costUsd / 1000).toFixed(1)}k`;
    } else {
        cost = `~$${Math.round(costUsd / 5) * 5}`;
    }
    return `${weight} · ${cost}`;
}

/** External spur pair (machined steel, single stage). */
export function estimateSpur({ driverTeeth, drivenTeeth }) {
    const teeth = driverTeeth + drivenTeeth;
    const ratio = drivenTeeth / driverTeeth;
    const weightKg = 0.06 + teeth * 0.007;
    const costUsd = 20 + teeth * 1.2 + Math.min(ratio, 6) * 8;
    return { weightKg, costUsd };
}

/** Planetary with fixed ring (sun input, carrier output). */
export function estimatePlanetary({ sunTeeth, planetTeeth }) {
    const ringTeeth = sunTeeth + 2 * planetTeeth;
    const parts = sunTeeth + planetTeeth * 3 + ringTeeth;
    const ratio = 1 + ringTeeth / sunTeeth;
    const weightKg = 0.3 + parts * 0.022;
    const costUsd = 70 + ratio * 40 + planetTeeth * 4;
    return { weightKg, costUsd };
}

/** Fixed-pin cycloidal (RV-style pin drive). */
export function estimateCycloidal({ lobes, pins, counterDisc }) {
    const ratio = lobes / (pins - lobes);
    const weightKg = 1.6 + pins * 0.14 + lobes * 0.1 + (counterDisc ? 0.5 : 0);
    const costUsd = 320 + ratio * 110 + pins * 22 + (counterDisc ? 90 : 0);
    return { weightKg, costUsd };
}

/** Strain-wave harmonic reducer. */
export function estimateHarmonic({ flexTeeth, circularTeeth }) {
    const ratio = circularTeeth / (circularTeeth - flexTeeth);
    const weightKg = 0.12 + flexTeeth * 0.0055;
    const costUsd = 160 + ratio * 85 + flexTeeth * 2.5;
    return { weightKg, costUsd };
}

export function estimateLabel(estimate) {
    return `Est. ${formatEstimate(estimate.weightKg, estimate.costUsd)}`;
}
