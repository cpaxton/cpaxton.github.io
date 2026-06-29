import { createSpurDemo } from './spur.js';
import { createPlanetaryDemo } from './planetary.js';
import { createCycloidalDemo } from './cycloidal.js';
import { createHarmonicDemo } from './harmonic.js';
import { isWobbleVisible, setWobbleVisible } from './overlays.js';

const demos = [
    { id: 'spur', create: createSpurDemo, canvasId: 'canvas-spur' },
    { id: 'planetary', create: createPlanetaryDemo, canvasId: 'canvas-planetary' },
    { id: 'cycloidal', create: createCycloidalDemo, canvasId: 'canvas-cycloidal' },
    { id: 'harmonic', create: createHarmonicDemo, canvasId: 'canvas-harmonic' },
];

const demoInstances = [];

function updateReadout(card, demo) {
    const readout = card.querySelector('.ratio-readout');
    if (readout) {
        readout.textContent = demo.getReductionLabel();
    }
}

function updateContactReadout(card, demo) {
    const readout = card.querySelector('.contact-readout');
    if (!readout) return;
    if (!demo.getContactInfo) {
        readout.textContent = '';
        readout.hidden = true;
        return;
    }
    const info = demo.getContactInfo();
    readout.hidden = !info;
    readout.textContent = info ? info.readout : '';
}

function syncParamSliders(card, params) {
    card.querySelectorAll('.param-slider').forEach((slider) => {
        const key = slider.dataset.param;
        if (key && params[key] !== undefined) {
            slider.value = params[key];
        }
    });
}

function updateSpurDrivenRange(card, driverTeeth) {
    const drivenSlider = card.querySelector('[data-param="drivenTeeth"]');
    if (!drivenSlider) return;
    const minDriven = driverTeeth + 6;
    drivenSlider.min = minDriven;
    if (parseInt(drivenSlider.value, 10) < minDriven) {
        drivenSlider.value = minDriven;
    }
}

function updateCycloidalPinRange(card, lobes) {
    const pinsSlider = card.querySelector('[data-param="pins"]');
    if (!pinsSlider) return;
    pinsSlider.min = lobes + 1;
    if (parseInt(pinsSlider.value, 10) <= lobes) {
        pinsSlider.value = lobes + 1;
    }
}

function updateHarmonicCircularRange(card, flexTeeth) {
    const circularSlider = card.querySelector('[data-param="circularTeeth"]');
    if (!circularSlider) return;
    circularSlider.min = flexTeeth + 2;
    if (parseInt(circularSlider.value, 10) <= flexTeeth) {
        circularSlider.value = flexTeeth + 2;
    }
}

function syncCycloidalVariant(card, variant) {
    card.querySelectorAll('[data-cycloid-variant]').forEach((btn) => {
        const active = btn.dataset.cycloidVariant === variant;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function wireCycloidalVariant(card, demo) {
    card.querySelectorAll('[data-cycloid-variant]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const variant = btn.dataset.cycloidVariant;
            const params = demo.setParams({ variant });
            syncCycloidalVariant(card, params.variant);
            updateReadout(card, demo);
        });
    });
    syncCycloidalVariant(card, demo.getParams().variant);
}

function syncCycloidalCounterDisc(card, enabled) {
    const btn = card.querySelector('[data-cycloid-counter-disc]');
    if (!btn) return;
    btn.classList.toggle('active', enabled);
    btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
}

function wireCycloidalCounterDisc(card, demo) {
    const btn = card.querySelector('[data-cycloid-counter-disc]');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const enabled = !demo.getParams().counterDisc;
        const params = demo.setParams({ counterDisc: enabled });
        syncCycloidalCounterDisc(card, params.counterDisc);
        updateReadout(card, demo);
    });
    syncCycloidalCounterDisc(card, demo.getParams().counterDisc);
}

function syncWobbleToggle() {
    const visible = isWobbleVisible();
    document.querySelectorAll('[data-overlay="wobble"]').forEach((btn) => {
        btn.classList.toggle('active', visible);
        btn.setAttribute('aria-pressed', visible ? 'true' : 'false');
    });
}

function wireWobbleToggle() {
    document.querySelectorAll('[data-overlay="wobble"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            setWobbleVisible(!isWobbleVisible());
            syncWobbleToggle();
            demoInstances.forEach(({ demo }) => demo.redraw());
        });
    });
    syncWobbleToggle();
}

function wireControls(card, demo, demoId) {
    const playBtn = card.querySelector('.play-btn');
    const stepBtn = card.querySelector('.step-btn');
    const speedSlider = card.querySelector('.speed-slider');
    const paramSliders = card.querySelectorAll('.param-slider');

    playBtn.addEventListener('click', () => {
        if (demo.isPlaying()) {
            demo.stop();
            playBtn.textContent = 'Play';
            playBtn.classList.add('paused');
        } else {
            demo.start();
            playBtn.textContent = 'Pause';
            playBtn.classList.remove('paused');
        }
    });

    stepBtn.addEventListener('click', () => {
        demo.stop();
        playBtn.textContent = 'Play';
        playBtn.classList.add('paused');
        demo.step();
        updateContactReadout(card, demo);
    });

    speedSlider.addEventListener('input', (e) => {
        demo.setSpeed(parseFloat(e.target.value));
    });

    paramSliders.forEach((slider) => {
        slider.addEventListener('input', () => {
            const key = slider.dataset.param;
            const updates = { [key]: parseInt(slider.value, 10) };

            if (demoId === 'spur' && key === 'driverTeeth') {
                updateSpurDrivenRange(card, updates.driverTeeth);
            }
            if (demoId === 'cycloidal' && key === 'lobes') {
                updateCycloidalPinRange(card, updates.lobes);
            }
            if (demoId === 'harmonic' && key === 'flexTeeth') {
                updateHarmonicCircularRange(card, updates.flexTeeth);
            }

            const params = demo.setParams(updates);
            syncParamSliders(card, params);
            updateReadout(card, demo);
            updateContactReadout(card, demo);

            if (!demo.isPlaying()) {
                demo.redraw();
            }
        });
    });

    const params = demo.getParams();
    syncParamSliders(card, params);

    if (demoId === 'spur') {
        updateSpurDrivenRange(card, params.driverTeeth);
    }
    if (demoId === 'cycloidal') {
        updateCycloidalPinRange(card, params.lobes);
        wireCycloidalVariant(card, demo);
        wireCycloidalCounterDisc(card, demo);
    }
    if (demoId === 'harmonic') {
        updateHarmonicCircularRange(card, params.flexTeeth);
    }

    updateReadout(card, demo);
    updateContactReadout(card, demo);
}

document.addEventListener('DOMContentLoaded', () => {
    wireWobbleToggle();

    demos.forEach(({ id, create, canvasId }) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const demo = create(canvas);
        const card = canvas.closest('.demo-card');
        if (card) {
            wireControls(card, demo, id);
            demoInstances.push({ demo, card });
        }
    });
});
