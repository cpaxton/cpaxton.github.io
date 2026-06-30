/**
 * Global overlay toggles and off-axis (wobble) motion indicator.
 */

import { isWobbleVisible } from './overlay-prefs.js';

export {
    isWobbleVisible,
    setWobbleVisible,
    isContactOverlayVisible,
    setContactOverlayVisible,
} from './overlay-prefs.js';

const TAU = Math.PI * 2;

/** Ring buffer of offset-from-axis samples (dx, dy). */
export function createWobbleTracker(maxPoints = 110) {
    const points = [];
    return {
        reset() {
            points.length = 0;
        },
        sample(dx, dy) {
            points.push({ x: dx, y: dy });
            if (points.length > maxPoints) {
                points.shift();
            }
        },
        getPoints() {
            return points;
        },
    };
}

/**
 * Draw design axis, wobble trail, and current offset vector.
 * @param {number} axisX - fixed shaft / housing center
 * @param {number} axisY
 * @param {number} wobbleX - point that would shake the structure (world coords)
 * @param {number} wobbleY
 */
export function drawWobbleIndicator(ctx, axisX, axisY, wobbleX, wobbleY, tracker, options = {}) {
    if (!isWobbleVisible()) return null;

    const {
        label = 'Off-axis shake',
        color = '#ff6b8a',
        axisColor = 'rgba(255,255,255,0.35)',
        showReadout = true,
        subdued = false,
    } = options;

    const dx = wobbleX - axisX;
    const dy = wobbleY - axisY;
    const magnitude = Math.hypot(dx, dy);

    tracker.sample(dx, dy);

    const alpha = subdued ? 0.45 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;

    const cross = 10;
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(axisX - cross, axisY);
    ctx.lineTo(axisX + cross, axisY);
    ctx.moveTo(axisX, axisY - cross);
    ctx.lineTo(axisX, axisY + cross);
    ctx.stroke();
    ctx.setLineDash([]);

    const trail = tracker.getPoints();
    if (trail.length > 1) {
        ctx.strokeStyle = `${color}88`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(axisX + trail[0].x, axisY + trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(axisX + trail[i].x, axisY + trail[i].y);
        }
        ctx.stroke();
    }

    if (magnitude > 0.4) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(axisX, axisY);
        ctx.lineTo(wobbleX, wobbleY);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(wobbleX, wobbleY, 5, 0, TAU);
        ctx.fill();
    } else {
        ctx.fillStyle = `${color}99`;
        ctx.beginPath();
        ctx.arc(axisX, axisY, 4, 0, TAU);
        ctx.fill();
    }

    if (showReadout) {
        ctx.font = '11px Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(axisX + 14, axisY - 28, 148, 34);
        ctx.fillStyle = color;
        const magLabel = magnitude >= 1 ? `${magnitude.toFixed(1)} px` : `${magnitude.toFixed(2)} px`;
        ctx.fillText(label, axisX + 20, axisY - 24);
        ctx.fillStyle = '#ccc';
        ctx.fillText(`offset ${magLabel}`, axisX + 20, axisY - 10);
    }

    ctx.restore();
    return { dx, dy, magnitude };
}
