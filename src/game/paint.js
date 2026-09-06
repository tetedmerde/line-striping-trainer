import { COLORS } from './missions.js';

/**
 * Offscreen paint layer — continuous soft airless coat (not speckles).
 * World units = plan pixels.
 */
export class PaintLayer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.last = null;
    this.colorKey = 'yellow';
    this.lineWidth = 4.2; // ~4" look at this map scale
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.last = null;
  }

  setColor(key) {
    this.colorKey = key;
  }

  beginStroke() {
    this.last = null;
  }

  /**
   * Lay a smooth coat segment. Soft edges via light blur + round caps.
   * @param {{x:number,y:number}} tip
   * @param {boolean} spraying
   */
  spray(tip, spraying) {
    if (!spraying) {
      this.last = null;
      return;
    }

    const ctx = this.ctx;
    const color = COLORS[this.colorKey] || COLORS.yellow;
    const w = this.lineWidth;

    if (!this.last) {
      this.last = { ...tip };
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 1.6;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, w * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const dx = tip.x - this.last.x;
    const dy = tip.y - this.last.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.35) return;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 1.8;
    ctx.globalAlpha = 0.92;

    ctx.beginPath();
    ctx.moveTo(this.last.x, this.last.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();

    // Second pass slightly narrower for solid core (airless look)
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.lineWidth = w * 0.72;
    ctx.beginPath();
    ctx.moveTo(this.last.x, this.last.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.restore();

    this.last = { ...tip };
  }

  /**
   * Coverage scoring: sample along guides, check nearby paint matches color.
   * @param {import('./missions.js').Guide[]} guides
   * @param {string[]} allowedColors
   */
  score(guides, allowedColors) {
    const ctx = this.ctx;
    const { width, height } = this;
    let hits = 0;
    let total = 0;
    const radius = 5;

    for (const guide of guides) {
      const len = Math.hypot(guide.b.x - guide.a.x, guide.b.y - guide.a.y) || 1;
      const steps = Math.max(8, Math.ceil(len / 6));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = guide.a.x + (guide.b.x - guide.a.x) * t;
        const y = guide.a.y + (guide.b.y - guide.a.y) * t;
        total += 1;
        if (this._sampleHasColor(ctx, x, y, radius, width, height, guide.color, allowedColors)) {
          hits += 1;
        }
      }
    }

    const coverage = total ? Math.round((hits / total) * 100) : 0;
    return { coverage, hits, total };
  }

  _sampleHasColor(ctx, cx, cy, r, w, h, want, allowed) {
    const x0 = Math.max(0, Math.floor(cx - r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const x1 = Math.min(w - 1, Math.ceil(cx + r));
    const y1 = Math.min(h - 1, Math.ceil(cy + r));
    const sw = x1 - x0 + 1;
    const sh = y1 - y0 + 1;
    if (sw <= 0 || sh <= 0) return false;

    const data = ctx.getImageData(x0, y0, sw, sh).data;
    const target = hexToRgb(COLORS[want] || COLORS.yellow);
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 40) continue;
      const dr = data[i] - target.r;
      const dg = data[i + 1] - target.g;
      const db = data[i + 2] - target.b;
      if (dr * dr + dg * dg + db * db < 85 * 85) {
        // Wrong-color penalty: if painted but wrong family vs allowed, no credit
        if (allowed && allowed.length && !allowed.includes(want)) {
          /* guide color is want; paint matching want is fine */
        }
        return true;
      }
    }
    return false;
  }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
