/**
 * Canvas rendering for sampled gear profiles.
 */

import { pitchRadius } from './constraints.js';

export function drawPath(ctx, points, close = true) {
    if (points.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    if (close) ctx.closePath();
}

export function drawProfile(ctx, points, options = {}) {
    const {
        fill = '#c0c0c8',
        stroke = '#333',
        lineWidth = 1.5,
        close = true,
    } = options;

    drawPath(ctx, points, close);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

export function drawProfileAt(ctx, x, y, angle, points, options = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    drawProfile(ctx, points, options);
    ctx.restore();
}

export function drawPitchCircle(ctx, x, y, pitchR, angle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(0, 0, pitchR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

export function drawGearLabel(ctx, x, y, text, color = '#fff') {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = 'bold 12px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
}

export function drawInvoluteGear(ctx, x, y, teeth, module, angle, options = {}) {
    const {
        fill = '#c0c0c8',
        stroke = '#333',
        label = null,
        labelColor = '#fff',
        holeRadius = 0,
        showPitchCircle = true,
        sampleFn,
        pressureAngle,
        points: cachedPoints = null,
    } = options;

    const pitchR = pitchRadius(teeth, module);
    const points = cachedPoints ?? sampleFn(teeth, module, pressureAngle);

    drawProfileAt(ctx, x, y, angle, points, { fill, stroke });

    if (showPitchCircle) {
        drawPitchCircle(ctx, x, y, pitchR);
    }

    if (holeRadius > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, holeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.restore();
    }

    if (label) {
        drawGearLabel(ctx, x, y, label, labelColor);
    }
}

export function drawPolyline(ctx, points, options = {}) {
    const { stroke = '#333', lineWidth = 1.5, fill = null, close = false } = options;
    drawPath(ctx, points, close);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

export function drawPolylineAt(ctx, x, y, angle, points, options = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    drawPolyline(ctx, points, options);
    ctx.restore();
}

export function drawCircle(ctx, x, y, radius, options = {}) {
    const { fill = null, stroke = '#333', lineWidth = 1.5 } = options;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

export function transformPoints(points, x, y, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return points.map((p) => ({
        x: x + p.x * c - p.y * s,
        y: y + p.x * s + p.y * c,
    }));
}
