/**
 * Legacy radial-tooth renderer for ?mode=schematic URL flag.
 */

const GEAR_ADDENDUM = 0.055;
const GEAR_DEDENDUM = 0.065;
const GEAR_TOOTH_HALF = 0.19;
const TAU = Math.PI * 2;

function traceRadialGear(ctx, pitchRadius, teeth) {
    const outerRadius = pitchRadius * (1 + GEAR_ADDENDUM);
    const rootRadius = pitchRadius * (1 - GEAR_DEDENDUM);
    const pitch = TAU / teeth;
    const halfTooth = pitch * GEAR_TOOTH_HALF;

    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
        const peak = (i / teeth) * TAU;
        const valley = peak + pitch / 2;
        if (i === 0) {
            ctx.moveTo(
                Math.cos(peak - halfTooth) * rootRadius,
                Math.sin(peak - halfTooth) * rootRadius
            );
        }
        ctx.lineTo(Math.cos(peak - halfTooth) * outerRadius, Math.sin(peak - halfTooth) * outerRadius);
        ctx.lineTo(Math.cos(peak + halfTooth) * outerRadius, Math.sin(peak + halfTooth) * outerRadius);
        ctx.lineTo(Math.cos(valley - halfTooth) * rootRadius, Math.sin(valley - halfTooth) * rootRadius);
        ctx.lineTo(Math.cos(valley + halfTooth) * rootRadius, Math.sin(valley + halfTooth) * rootRadius);
    }
    ctx.closePath();
}

export function drawRadialGear(ctx, x, y, pitchRadius, teeth, angle, options = {}) {
    const { fill = '#c0c0c8', stroke = '#333', label = null, labelColor = '#fff', holeRadius = 0 } = options;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    traceRadialGear(ctx, pitchRadius, teeth);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (holeRadius > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, holeRadius, 0, TAU);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
    }
    if (label) {
        ctx.fillStyle = labelColor;
        ctx.font = 'bold 12px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 0);
    }
    ctx.restore();
}

export function applyHalfPlaneClip(ctx, px, py, normalAngle, keepPositive) {
    const nx = Math.cos(normalAngle);
    const ny = Math.sin(normalAngle);
    const sign = keepPositive ? 1 : -1;
    const tx = -ny;
    const ty = nx;
    const span = 8000;
    ctx.beginPath();
    ctx.moveTo(px + tx * span, py + ty * span);
    ctx.lineTo(px - tx * span, py - ty * span);
    ctx.lineTo(px - tx * span + nx * sign * span, py - ty * span + ny * sign * span);
    ctx.lineTo(px + tx * span + nx * sign * span, py + ty * span + ny * sign * span);
    ctx.closePath();
    ctx.clip();
}

export function drawRadialGearPair(ctx, gearA, gearB) {
    const contactX = (gearA.x + gearB.x) / 2;
    const contactY = (gearA.y + gearB.y) / 2;
    const meshAngle = Math.atan2(gearB.y - gearA.y, gearB.x - gearA.x);
    ctx.save();
    applyHalfPlaneClip(ctx, contactX, contactY, meshAngle, false);
    drawRadialGear(ctx, gearA.x, gearA.y, gearA.pitchRadius, gearA.teeth, gearA.angle, gearA.options);
    ctx.restore();
    ctx.save();
    applyHalfPlaneClip(ctx, contactX, contactY, meshAngle, true);
    drawRadialGear(ctx, gearB.x, gearB.y, gearB.pitchRadius, gearB.teeth, gearB.angle, gearB.options);
    ctx.restore();
}
