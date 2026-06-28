/**
 * Schematic vs physics fidelity for gear demos.
 * - schematic: fast previews, radial spur teeth, no contact solver overlay
 * - physics: conjugate profiles, mesh alignment, clearance overlay (default)
 */

let activeMode = null;

export function getFidelityMode() {
    if (activeMode) return activeMode;
    if (typeof window === 'undefined') return 'physics';
    const urlMode = new URLSearchParams(window.location.search).get('mode');
    if (urlMode === 'schematic' || urlMode === 'physics') {
        return urlMode;
    }
    return 'physics';
}

export function setFidelityMode(mode) {
    if (mode !== 'schematic' && mode !== 'physics') return;
    activeMode = mode;
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fidelitychange', { detail: mode }));
    }
}

export function isPhysicsMode() {
    return getFidelityMode() === 'physics';
}

export function isSchematicMode() {
    return getFidelityMode() === 'schematic';
}

/** @deprecated Use getFidelityMode() === 'schematic' for radial spur teeth. */
export function getRenderMode() {
    return isSchematicMode() ? 'schematic' : 'conjugate';
}
