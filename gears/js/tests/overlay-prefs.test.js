import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function withWindow(search, store, fn) {
    const prev = global.window;
    global.window = {
        location: { search },
        localStorage: {
            _s: { ...store },
            getItem(k) { return this._s[k] ?? null; },
            setItem(k, v) { this._s[k] = v; },
        },
    };
    return import('../overlay-prefs.js?test=' + Math.random()).then(fn).finally(() => {
        global.window = prev;
    });
}

describe('overlay prefs', () => {
    it('defaults clearance off and wobble on', async () => {
        await withWindow('', {}, async (prefs) => {
            assert.equal(prefs.isContactOverlayVisible(), false);
            assert.equal(prefs.isWobbleVisible(), true);
        });
    });

    it('toggles clearance visibility in memory', async () => {
        await withWindow('', {}, async (prefs) => {
            assert.equal(prefs.isContactOverlayVisible(), false);
            prefs.setContactOverlayVisible(true);
            assert.equal(prefs.isContactOverlayVisible(), true);
        });
    });

    it('reads clearance=1 from URL', async () => {
        await withWindow('?clearance=1', {}, async (prefs) => {
            assert.equal(prefs.isContactOverlayVisible(), true);
        });
    });

    it('reads clearance=0 from URL', async () => {
        await withWindow('?clearance=0', {}, async (prefs) => {
            assert.equal(prefs.isContactOverlayVisible(), false);
        });
    });
});
