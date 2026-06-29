/**
 * Visual clearance overlay for physics mode.
 */

import { isMeshClearanceOk, MIN_MESH_CLEARANCE_COEFF } from './constraints.js';

const TAU = Math.PI * 2;

export function drawContactOverlay(ctx, contact, module, options = {}) {
    const {
        x = 12,
        y = 18,
        isClearanceOk = isMeshClearanceOk,
    } = options;

    if (!contact || contact.clearance === Infinity || !contact.pointA || !contact.pointB) {
        return;
    }

    if (contact.engaged === false) {
        return;
    }

    const ok = isClearanceOk(contact.clearance, module);
    const color = ok ? '#5dff9a' : '#ff6b6b';
    const gapPx = contact.clearance;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(contact.pointA.x, contact.pointA.y);
    ctx.lineTo(contact.pointB.x, contact.pointB.y);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const pt of [contact.pointA, contact.pointB]) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, TAU);
        ctx.fill();
    }

    ctx.font = '12px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 6, y - 4, 210, contact.label ? 36 : 22);
    ctx.fillStyle = color;
    const gapLabel = gapPx >= 1 ? `${gapPx.toFixed(2)} px` : `${(gapPx / Math.max(module, 1e-6)).toFixed(3)}× m`;
    const minLabel = `${MIN_MESH_CLEARANCE_COEFF.toFixed(3)}× m min`;
    ctx.fillText(`Clearance: ${gapLabel} ${ok ? 'OK' : 'OFF'}`, x, y);
    if (contact.label) {
        ctx.fillStyle = '#ccc';
        ctx.fillText(`${contact.label} · target ≥ ${minLabel}`, x, y + 14);
    }
    ctx.restore();
}

export function formatContactReadout(contact, module, options = {}) {
    const { isClearanceOk = isMeshClearanceOk } = options;
    if (!contact || contact.clearance === Infinity) return '';
    const ok = isClearanceOk(contact.clearance, module);
    const gap = contact.clearance >= 1
        ? `${contact.clearance.toFixed(1)} px`
        : `${(contact.clearance / module).toFixed(3)}× module`;
    return `Mesh ${ok ? 'OK' : 'off'} · ${gap}`;
}
