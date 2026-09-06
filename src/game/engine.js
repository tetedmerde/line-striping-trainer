import { COLORS } from './missions.js';
import {
  LOT_W,
  LOT_H,
  drawLot,
  drawGuides,
  buildGuideMask,
  maskColorId,
} from './lot.js';

const BRUSH = 10;
const SAMPLE_STEP = 2;

export class StripingGame {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} opts
   */
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.mission = opts.mission;
    this.mode = opts.mode; // 'practice' | 'test'
    this.onScore = opts.onScore || (() => {});
    this.onComplete = opts.onComplete || (() => {});

    this.color = this.mission.allowedColors[0] || 'white';
    this.painting = false;
    this.last = null;
    this.camX = 0;
    this.camY = 0;
    this.keys = new Set();
    this.running = false;
    this.raf = 0;
    this.scoreTimer = 0;
    this.lastScore = null;

    canvas.width = LOT_W;
    canvas.height = LOT_H;

    // Paint layer (separate so we can score it)
    this.paintCanvas = document.createElement('canvas');
    this.paintCanvas.width = LOT_W;
    this.paintCanvas.height = LOT_H;
    this.paintCtx = this.paintCanvas.getContext('2d', { willReadFrequently: true });

    this.guideMask = buildGuideMask(this.mission);

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onKeyDown = this.onKeyDown.bind(this);
    this._onKeyUp = this.onKeyUp.bind(this);
  }

  start() {
    this.running = true;
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.loop();
    this.recomputeScore();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  setColor(name) {
    if (this.mission.allowedColors.includes(name)) {
      this.color = name;
    }
  }

  finish() {
    const score = this.recomputeScore();
    this.onComplete(score);
  }

  onKeyDown(e) {
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (k === '1') this.setColor('white');
    if (k === '2') this.setColor('yellow');
    if (k === '3') this.setColor('blue');
    if (k === 'enter') {
      e.preventDefault();
      this.finish();
    }
  }

  onKeyUp(e) {
    this.keys.delete(e.key.toLowerCase());
  }

  pointerToLot(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX - this.camX,
      y: (e.clientY - rect.top) * scaleY - this.camY,
    };
  }

  onPointerDown(e) {
    this.canvas.setPointerCapture?.(e.pointerId);
    this.painting = true;
    this.last = this.pointerToLot(e);
    this.paintAt(this.last.x, this.last.y);
  }

  onPointerMove(e) {
    if (!this.painting) return;
    const p = this.pointerToLot(e);
    this.paintStroke(this.last, p);
    this.last = p;
  }

  onPointerUp() {
    this.painting = false;
    this.last = null;
    this.recomputeScore();
  }

  paintAt(x, y) {
    const ctx = this.paintCtx;
    ctx.fillStyle = COLORS[this.color];
    ctx.beginPath();
    ctx.arc(x, y, BRUSH / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  paintStroke(a, b) {
    if (!a || !b) return;
    const ctx = this.paintCtx;
    ctx.strokeStyle = COLORS[this.color];
    ctx.lineWidth = BRUSH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  loop = () => {
    if (!this.running) return;
    this.updateCamera();
    this.render();
    this.scoreTimer += 1;
    if (this.scoreTimer % 30 === 0 && this.painting) {
      this.recomputeScore();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  updateCamera() {
    const speed = 6;
    if (this.keys.has('w') || this.keys.has('arrowup')) this.camY += speed;
    if (this.keys.has('s') || this.keys.has('arrowdown')) this.camY -= speed;
    if (this.keys.has('a') || this.keys.has('arrowleft')) this.camX += speed;
    if (this.keys.has('d') || this.keys.has('arrowright')) this.camX -= speed;
    const maxPan = 80;
    this.camX = Math.max(-maxPan, Math.min(maxPan, this.camX));
    this.camY = Math.max(-maxPan, Math.min(maxPan, this.camY));
  }

  guideOpacity() {
    if (this.mode === 'practice') return 0.5;
    // Test mode: guides fade based on coverage progress
    const s = this.lastScore;
    if (!s) return 0.28;
    if (s.coverage >= 85) return 0.05;
    if (s.coverage >= 50) return 0.12;
    return 0.22;
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, LOT_W, LOT_H);
    ctx.setTransform(1, 0, 0, 1, this.camX, this.camY);

    drawLot(ctx, {
      showAdaSymbols: this.mission.showAdaSymbols,
    });

    // Ghost guides
    drawGuides(ctx, this.mission, this.guideOpacity());

    // Player paint
    ctx.drawImage(this.paintCanvas, 0, 0);

    // Brush cursor hint when hovering — skipped (pointer is enough)
  }

  /**
   * Score paint vs guide mask.
   * Metrics:
   *  - coverage: % of guide pixels that have correct-color paint nearby
   *  - overspray: penalty for paint outside guides
   *  - wrongColor: penalty for painting guide with wrong color
   */
  recomputeScore() {
    const guide = this.guideMask.imageData.data;
    const paint = this.paintCtx.getImageData(0, 0, LOT_W, LOT_H).data;

    let guidePixels = 0;
    let covered = 0;
    let wrongColor = 0;
    let paintOutside = 0;
    let paintTotal = 0;

    const w = LOT_W;
    const h = LOT_H;

    // Sample guide coverage
    for (let y = 0; y < h; y += SAMPLE_STEP) {
      for (let x = 0; x < w; x += SAMPLE_STEP) {
        const i = (y * w + x) * 4;
        const ga = guide[i + 3];
        if (ga < 128) continue;
        guidePixels++;
        const expected = maskColorId(guide[i], guide[i + 1], guide[i + 2]);
        const hit = this.samplePaintColor(paint, x, y, w, h, BRUSH * 0.7);
        if (hit) {
          if (hit === expected) covered++;
          else wrongColor++;
        }
      }
    }

    // Overspray: paint pixels far from any guide
    for (let y = 0; y < h; y += SAMPLE_STEP * 2) {
      for (let x = 0; x < w; x += SAMPLE_STEP * 2) {
        const i = (y * w + x) * 4;
        if (paint[i + 3] < 40) continue;
        paintTotal++;
        if (!this.nearGuide(guide, x, y, w, h, BRUSH * 1.4)) {
          paintOutside++;
        }
      }
    }

    const coverage = guidePixels ? (covered / guidePixels) * 100 : 0;
    const wrongRate = guidePixels ? (wrongColor / guidePixels) * 100 : 0;
    const oversprayRate = paintTotal ? (paintOutside / paintTotal) * 100 : 0;

    // Weighted score
    let score =
      coverage * 0.7 +
      Math.max(0, 100 - oversprayRate * 1.5) * 0.2 +
      Math.max(0, 100 - wrongRate * 3) * 0.1;

    // Soft floor if nothing painted
    if (paintTotal === 0) score = 0;

    score = Math.round(Math.max(0, Math.min(100, score)));

    const result = {
      score,
      coverage: Math.round(coverage),
      overspray: Math.round(oversprayRate),
      wrongColor: Math.round(wrongRate),
      pass: score >= 70,
    };

    this.lastScore = result;
    this.onScore(result);
    return result;
  }

  samplePaintColor(paint, x, y, w, h, radius) {
    const r = Math.ceil(radius);
    let best = null;
    let bestA = 0;
    for (let dy = -r; dy <= r; dy += 2) {
      for (let dx = -r; dx <= r; dx += 2) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const i = (py * w + px) * 4;
        const a = paint[i + 3];
        if (a < 80) continue;
        if (a > bestA) {
          bestA = a;
          best = classifyPaint(paint[i], paint[i + 1], paint[i + 2]);
        }
      }
    }
    return best;
  }

  nearGuide(guide, x, y, w, h, radius) {
    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy += 2) {
      for (let dx = -r; dx <= r; dx += 2) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const i = (py * w + px) * 4;
        if (guide[i + 3] >= 128) return true;
      }
    }
    return false;
  }
}

function classifyPaint(r, g, b) {
  // Match COLORS
  if (b > 150 && b > r && b > g) return 'blue';
  if (r > 200 && g > 180 && b < 100) return 'yellow';
  if (r > 200 && g > 200 && b > 200) return 'white';
  if (r > 180 && g > 180 && b > 160) return 'white';
  return 'white';
}
