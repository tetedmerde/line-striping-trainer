import { COLORS, PLAN_W, PLAN_H } from './missions.js';
import { SCALE } from './coords.js';

/**
 * Offscreen paint layer — continuous soft airless coat (not speckles).
 * Stored in plan-pixel space; uploaded as transparent overlay on asphalt.
 */
export class PaintLayer {
  constructor(width = PLAN_W, height = PLAN_H) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.last = null;
    this.colorKey = 'yellow';
    /** ~4″ at map scale (plan px) */
    this.lineWidth = 4.2;
    this.dirty = true;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.last = null;
    this.dirty = true;
  }

  setColor(key) {
    this.colorKey = key;
  }

  /**
   * @param {{x:number,y:number}} tipPlan plan-pixel tip
   * @param {boolean} spraying
   * @param {boolean} lockedQuality thicker/cleaner when locked
   */
  spray(tipPlan, spraying, lockedQuality = false) {
    if (!spraying) {
      this.last = null;
      return;
    }

    const ctx = this.ctx;
    const color = COLORS[this.colorKey] || COLORS.yellow;
    const w = lockedQuality ? this.lineWidth * 1.05 : this.lineWidth * 0.92;

    if (!this.last) {
      this.last = { ...tipPlan };
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 1.8;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(tipPlan.x, tipPlan.y, w * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      this.dirty = true;
      return;
    }

    const dx = tipPlan.x - this.last.x;
    const dy = tipPlan.y - this.last.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.3) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = lockedQuality ? 2.2 : 1.6;
    ctx.globalAlpha = lockedQuality ? 0.96 : 0.88;

    ctx.beginPath();
    ctx.moveTo(this.last.x, this.last.y);
    ctx.lineTo(tipPlan.x, tipPlan.y);
    ctx.stroke();

    // Solid core pass (airless look)
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.lineWidth = w * 0.7;
    ctx.beginPath();
    ctx.moveTo(this.last.x, this.last.y);
    ctx.lineTo(tipPlan.x, tipPlan.y);
    ctx.stroke();
    ctx.restore();

    this.last = { ...tipPlan };
    this.dirty = true;
  }

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
        void allowed;
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

/** World meters tip -> plan spray */
export function tipWorldToPlan(wx, wz) {
  return {
    x: wx / SCALE + PLAN_W * 0.5,
    y: wz / SCALE + PLAN_H * 0.5,
  };
}
