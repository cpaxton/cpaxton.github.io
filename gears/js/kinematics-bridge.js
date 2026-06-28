/**
 * Bridge kinematics exports with legacy names used by demos.
 */

import {
    spurDrivenAngle,
    spurDrivenOmega,
    planetaryCarrierAngle,
    planetaryPlanetAngleFromCounts,
    wormWheelAngle,
    cycloidalMotion,
    harmonicFlexAngle,
    harmonicRatio,
    cycloidalRatio,
    gapPhaseForContact,
} from './kinematics.js';
import { planetaryRingTeeth } from './constraints.js';

export {
    spurDrivenAngle,
    spurDrivenOmega,
    planetaryCarrierAngle,
    wormWheelAngle,
    cycloidalMotion,
    harmonicFlexAngle,
    harmonicRatio,
    cycloidalRatio,
    gapPhaseForContact,
};

export function computeMeshPhase(teeth, contactWorld) {
    return gapPhaseForContact(teeth, contactWorld);
}

export function meshDrivenAngle(driverAngle, driverTeeth, drivenTeeth) {
    return spurDrivenAngle(driverAngle, driverTeeth, drivenTeeth);
}

export function meshAngularVelocity(driverTeeth, drivenTeeth, driverOmega) {
    return spurDrivenOmega(driverOmega, driverTeeth, drivenTeeth);
}

export function meshPlanetAngle(sunAngle, orbitAngle, sunTeeth, planetTeeth, ringTeeth, planetIndex = 0) {
    return planetaryPlanetAngleFromCounts(sunAngle, orbitAngle, sunTeeth, planetTeeth, planetIndex);
}

export function computePlanetaryRing(sunTeeth, planetTeeth) {
    return planetaryRingTeeth(sunTeeth, planetTeeth);
}

export function cycloidalOutputAngle(inputAngle, pins, lobes) {
    return cycloidalMotion(inputAngle, pins, lobes).outputAngle;
}

export { planetaryPlanetAngleFromCounts };
export { planetaryPlanetAngleFromCounts as planetaryPlanetAngle };
