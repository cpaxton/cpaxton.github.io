/**
 * Global overlay visibility (wobble trace, mesh clearance debug).
 * Standalone module so contact-overlay.js does not import overlays.js.
 */

const WOBBLE_STORAGE_KEY = 'gears-show-wobble';
const CONTACT_STORAGE_KEY = 'gears-show-contact';

let showWobble = readWobblePref();
let showContact = readContactPref();

function readUrlFlag(...paramNames) {
    try {
        const params = new URLSearchParams(window.location.search);
        for (const name of paramNames) {
            if (params.has(name)) {
                return params.get(name) !== '0';
            }
        }
    } catch {
        /* ignore */
    }
    return null;
}

function readStoredFlag(storageKey) {
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored === '1') return true;
        if (stored === '0') return false;
    } catch {
        /* ignore */
    }
    return null;
}

function readWobblePref() {
    return readUrlFlag('wobble') ?? readStoredFlag(WOBBLE_STORAGE_KEY) ?? true;
}

function readContactPref() {
    return readUrlFlag('clearance', 'contact') ?? readStoredFlag(CONTACT_STORAGE_KEY) ?? false;
}

function writeOverlayPref(storageKey, visible) {
    try {
        localStorage.setItem(storageKey, visible ? '1' : '0');
    } catch {
        /* ignore */
    }
}

export function isWobbleVisible() {
    return showWobble;
}

export function setWobbleVisible(visible) {
    showWobble = Boolean(visible);
    writeOverlayPref(WOBBLE_STORAGE_KEY, showWobble);
}

export function isContactOverlayVisible() {
    return showContact;
}

export function setContactOverlayVisible(visible) {
    showContact = Boolean(visible);
    writeOverlayPref(CONTACT_STORAGE_KEY, showContact);
}
