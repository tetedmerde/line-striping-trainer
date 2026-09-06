/**
 * Draws a generic retail parking lot (asphalt, stalls, drive lanes, storefront).
 * No trademarked logos — storefront labeled "STORE".
 */

const LOT_W = 1000;
const LOT_H = 700;

export { LOT_W, LOT_H };

export function drawLot(ctx, options = {}) {
  const { showAdaSymbols = false } = options;

  // Asphalt base
  ctx.fillStyle = '#4a4f55';
  ctx.fillRect(0, 0, LOT_W, LOT_H);

  // Subtle asphalt noise / texture
  ctx.save();
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 400; i++) {
    const x = (i * 97) % LOT_W;
    const y = (i * 53) % LOT_H;
    ctx.fillStyle = i % 2 === 0 ? '#000' : '#fff';
    ctx.fillRect(x, y, 2 + (i % 3), 2);
  }
  ctx.restore();

  // Storefront strip (generic)
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(0, 0, LOT_W, 90);

  // Building face
  ctx.fillStyle = '#374151';
  ctx.fillRect(40, 10, 920, 70);

  // Glass bays
  ctx.fillStyle = '#93c5fd';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(70 + i * 110, 22, 80, 40);
  }

  // Generic label
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 28px Segoe UI, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('STORE', LOT_W / 2, 45);

  // Sidewalk / curb in front of store
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(0, 90, LOT_W, 24);

  // Curb paint accent
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(0, 110, LOT_W, 4);

  // Drive lane center dashes (pre-existing yellow — not mission targets)
  drawDashedLane(ctx, 200, 360, 800, 360);
  drawDashedLane(ctx, 500, 200, 500, 650);

  // Existing faint white stall layout (background context for all missions)
  drawBackgroundStalls(ctx);

  if (showAdaSymbols) {
    drawAdaPlaceholderIcons(ctx);
  }

  // Lot border
  ctx.strokeStyle = '#2d3238';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, LOT_W - 4, LOT_H - 4);
}

function drawDashedLane(ctx, x1, y1, x2, y2) {
  ctx.save();
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
  ctx.lineWidth = 4;
  ctx.setLineDash([24, 18]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawBackgroundStalls(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;

  // Front bay outline
  const rows = [
    { y: 180, h: 140 },
    { y: 420, h: 140 },
  ];
  for (const row of rows) {
    for (let i = 0; i <= 10; i++) {
      const x = 80 + i * 60;
      ctx.beginPath();
      ctx.moveTo(x, row.y);
      ctx.lineTo(x, row.y + row.h);
      ctx.stroke();
    }
    ctx.strokeRect(80, row.y, 600, row.h);
  }

  // Side bay (right)
  for (let i = 0; i <= 4; i++) {
    const y = 200 + i * 70;
    ctx.beginPath();
    ctx.moveTo(760, y);
    ctx.lineTo(940, y);
    ctx.stroke();
  }
  ctx.strokeRect(760, 200, 180, 280);

  ctx.restore();
}

function drawAdaPlaceholderIcons(ctx) {
  // Faint wheelchair-style icons in ADA bays (simple geometric, not a logo)
  drawPersonIcon(ctx, 118, 255);
  drawPersonIcon(ctx, 178, 255);
}

function drawPersonIcon(ctx, cx, cy) {
  ctx.save();
  ctx.fillStyle = 'rgba(37, 99, 235, 0.25)';
  ctx.beginPath();
  ctx.arc(cx, cy - 14, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 5, cy - 6, 10, 16);
  ctx.beginPath();
  ctx.ellipse(cx + 10, cy + 10, 10, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Rasterize guide shapes onto an offscreen canvas for scoring.
 * Returns ImageData of the guide mask (alpha encodes coverage; R channel encodes color id).
 */
export function buildGuideMask(mission, width = LOT_W, height = LOT_H) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, width, height);

  for (const r of mission.rects) {
    ctx.fillStyle = colorToMask(r.color);
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }

  for (const p of mission.polys) {
    if (p.points.length < 2) continue;
    ctx.strokeStyle = colorToMask(p.color);
    ctx.lineWidth = p.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p.points[0].x, p.points[0].y);
    for (let i = 1; i < p.points.length; i++) {
      ctx.lineTo(p.points[i].x, p.points[i].y);
    }
    ctx.stroke();
  }

  return {
    canvas,
    imageData: ctx.getImageData(0, 0, width, height),
  };
}

function colorToMask(name) {
  // Encode color identity in RGB while keeping full alpha for coverage
  if (name === 'white') return 'rgba(255, 0, 0, 1)';
  if (name === 'yellow') return 'rgba(0, 255, 0, 1)';
  if (name === 'blue') return 'rgba(0, 0, 255, 1)';
  return 'rgba(255, 255, 255, 1)';
}

export function maskColorId(r, g, b) {
  if (r > 200 && g < 50 && b < 50) return 'white';
  if (g > 200 && r < 50 && b < 50) return 'yellow';
  if (b > 200 && r < 50 && g < 50) return 'blue';
  return null;
}

/**
 * Draw ghost guides on the main canvas.
 */
export function drawGuides(ctx, mission, opacity = 0.45) {
  ctx.save();
  ctx.globalAlpha = opacity;

  for (const r of mission.rects) {
    ctx.fillStyle = guideFill(r.color);
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  }

  for (const p of mission.polys) {
    if (p.points.length < 2) continue;
    ctx.strokeStyle = guideFill(p.color);
    ctx.lineWidth = p.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p.points[0].x, p.points[0].y);
    for (let i = 1; i < p.points.length; i++) {
      ctx.lineTo(p.points[i].x, p.points[i].y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function guideFill(name) {
  if (name === 'white') return 'rgba(255, 255, 255, 0.85)';
  if (name === 'yellow') return 'rgba(250, 204, 21, 0.85)';
  if (name === 'blue') return 'rgba(59, 130, 246, 0.85)';
  return 'rgba(255,255,255,0.7)';
}
