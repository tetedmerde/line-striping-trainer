import {
  COLORS,
  PASS_THRESHOLD,
  PLAN_H,
  PLAN_W,
  getMission,
  guideDir,
} from './missions.js';
import { PaintLayer } from './paint.js';
import { Striper } from './striper.js';

const LASER_RANGE = 420;
const TARGET_HIT_RADIUS = 22;
const LOCK_ALIGN_DEG = 18;

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {ReturnType<typeof bindHud>} hud
   */
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hud = hud;

    this.plan = null;
    this.paint = new PaintLayer(PLAN_W, PLAN_H);
    this.striper = new Striper();

    this.mission = getMission(1);
    this.guideIndex = 0;
    this.target = { x: 0, y: 0 };
    this.laserOn = true;
    this.onTarget = false;
    this.laserHitGuide = null;

    this.colorKey = 'yellow';
    this.spraying = false;
    this.lastScore = null;

    this.cam = { x: 720, y: 1120, zoom: 1.55 };
    this.keys = new Set();
    this.dragging = false;
    this.dragLast = null;

    this.crew = makeCrew(18);
    this.running = false;
    this._raf = 0;
    this._last = 0;

    this._resize = () => this.resize();
    window.addEventListener('resize', this._resize);
    this.resize();
    this._bindInput();
  }

  async load() {
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}walmart-plan-2855.jpg`;
    await img.decode();
    this.plan = img;
    this.setMission(1);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this.update(dt);
      this.draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  setMission(id) {
    this.mission = getMission(id);
    this.guideIndex = 0;
    this.paint.clear();
    // Prefer mission's first allowed color so scoring isn't an instant fail
    if (this.mission.allowedColors?.length) {
      this.setColor(this.mission.allowedColors[0]);
    } else {
      this.paint.setColor(this.colorKey);
    }
    this.cam.x = this.mission.view.x;
    this.cam.y = this.mission.view.y;
    this.cam.zoom = this.mission.view.zoom;
    this.striper.unlock();
    this.lastScore = null;
    // Spawn already lined up on first guide so laser-lock is reachable in seconds
    const g0 = this.mission.guides[0];
    if (g0) {
      const ang = Math.atan2(g0.b.y - g0.a.y, g0.b.x - g0.a.x);
      this.striper.reset({
        x: g0.a.x - Math.cos(ang) * this.striper.armLength,
        y: g0.a.y - Math.sin(ang) * this.striper.armLength,
        rot: ang,
      });
    } else {
      this.striper.reset(this.mission.spawn);
    }
    this._placeTargetFromGuide();
    this.hud.setMission(this.mission);
    this.hud.setScore(null);
    this.toast(`Mission: ${this.mission.title}`);
  }

  cycleTarget() {
    const guides = this.mission.guides;
    if (!guides.length) return;
    this.guideIndex = (this.guideIndex + 1) % guides.length;
    this._placeTargetFromGuide();
    this.toast(`Target → guide ${this.guideIndex + 1}/${guides.length}`);
  }

  _placeTargetFromGuide() {
    const g = this.mission.guides[this.guideIndex];
    if (!g) return;
    // Place reflective box at the far end relative to striper tip
    const tip = this.striper.tip();
    const da = Math.hypot(g.a.x - tip.x, g.a.y - tip.y);
    const db = Math.hypot(g.b.x - tip.x, g.b.y - tip.y);
    const far = db >= da ? g.b : g.a;
    this.target = { x: far.x, y: far.y };
    this.activeGuide = g;
  }

  setColor(key) {
    if (!COLORS[key]) return;
    this.colorKey = key;
    this.paint.setColor(key);
    this.hud.setPaint(key);
  }

  tryLock() {
    if (this.striper.locked) {
      this.striper.unlock();
      this.hud.setLock(false);
      this.toast('Unlocked');
      return;
    }
    if (!this.laserOn) {
      this.toast('Turn laser on (G) first');
      return;
    }
    if (!this.onTarget || !this.laserHitGuide) {
      this.toast('Laser must be ON TARGET to lock');
      return;
    }
    this.striper.lock(this.laserHitGuide);
    this.hud.setLock(true);
    this.toast('LOCKED — hold path, Space to spray');
  }

  submitScore() {
    const result = this.paint.score(this.mission.guides, this.mission.allowedColors);
    this.lastScore = result;
    const pass = result.coverage >= PASS_THRESHOLD;
    this.hud.setScore(result.coverage, pass);
    this.toast(
      pass
        ? `HOOKERS pass — ${result.coverage}% coverage`
        : `Need ${PASS_THRESHOLD}%+ — got ${result.coverage}%`
    );
  }

  clearPaint() {
    this.paint.clear();
    this.lastScore = null;
    this.hud.setScore(null);
    this.toast('Paint cleared');
  }

  update(dt) {
    const input = {
      forward: (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0) -
        (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0),
      turn: (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) -
        (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0),
      precision: this.keys.has('shift'),
    };

    this.spraying = this.keys.has(' ') || this.keys.has('space');
    this.striper.update(dt, input);

    // Soft camera follow when not dragging
    if (!this.dragging) {
      const follow = 2.2 * dt;
      this.cam.x += (this.striper.x - this.cam.x) * follow;
      this.cam.y += (this.striper.y - this.cam.y) * follow;
    }

    this._updateLaser();
    this.paint.spray(this.striper.tip(), this.spraying && this.running);

    // Ambient crew
    for (const c of this.crew) {
      c.t += dt;
      c.x += Math.cos(c.heading) * c.spd * dt;
      c.y += Math.sin(c.heading) * c.spd * dt;
      if (c.t > c.turnIn) {
        c.heading += (Math.random() - 0.5) * 1.2;
        c.t = 0;
        c.turnIn = 2 + Math.random() * 4;
      }
      c.x = Math.max(200, Math.min(PLAN_W - 200, c.x));
      c.y = Math.max(400, Math.min(PLAN_H - 120, c.y));
    }

    this.hud.setLaser(this.laserOn, this.onTarget);
    this.hud.setTarget(this.onTarget ? 'ON TARGET' : 'SEEK');
    this.hud.setLock(this.striper.locked);
  }

  _updateLaser() {
    this.onTarget = false;
    this.laserHitGuide = null;
    if (!this.laserOn) return;

    const tip = this.striper.tip();
    const hx = Math.cos(this.striper.rot);
    const hy = Math.sin(this.striper.rot);

    // Distance from target to laser ray
    const toTx = this.target.x - tip.x;
    const toTy = this.target.y - tip.y;
    const along = toTx * hx + toTy * hy;
    if (along > 8 && along < LASER_RANGE) {
      const closestX = tip.x + hx * along;
      const closestY = tip.y + hy * along;
      const miss = Math.hypot(this.target.x - closestX, this.target.y - closestY);
      if (miss <= TARGET_HIT_RADIUS) {
        this.onTarget = true;
        // Prefer active guide; else nearest guide aligned with heading
        const g = this.activeGuide || this.mission.guides[this.guideIndex];
        if (g) {
          const dir = guideDir(g);
          const align = Math.abs(dir.x * hx + dir.y * hy);
          if (align > Math.cos((LOCK_ALIGN_DEG * Math.PI) / 180) || this.striper.locked) {
            this.laserHitGuide = g;
          } else {
            // Still allow lock on active guide when on target — playable first
            this.laserHitGuide = g;
          }
        }
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1a1f28';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.cam.zoom, this.cam.zoom);
    ctx.translate(-this.cam.x, -this.cam.y);

    // Plan lot
    if (this.plan) {
      ctx.drawImage(this.plan, 0, 0, PLAN_W, PLAN_H);
    } else {
      ctx.fillStyle = '#cfd5dd';
      ctx.fillRect(0, 0, PLAN_W, PLAN_H);
    }

    // Slight wash so paint & guides pop
    ctx.fillStyle = 'rgba(10, 14, 20, 0.12)';
    ctx.fillRect(0, 0, PLAN_W, PLAN_H);

    // Guides
    this._drawGuides(ctx);

    // Paint
    ctx.drawImage(this.paint.canvas, 0, 0);

    // Crew dots
    for (const c of this.crew) {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '5px sans-serif';
      ctx.fillText('H', c.x - 1.5, c.y + 1.5);
    }

    // Target box
    this._drawTarget(ctx);

    // Laser
    this._drawLaser(ctx);

    // Locked path hint
    if (this.striper.locked && this.striper.lockGuide) {
      const g = this.striper.lockGuide;
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 197, 24, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(g.a.x, g.a.y);
      ctx.lineTo(g.b.x, g.b.y);
      ctx.stroke();
      ctx.restore();
    }

    // Striper
    this.striper.draw(ctx);

    ctx.restore();
  }

  _drawGuides(ctx) {
    for (let i = 0; i < this.mission.guides.length; i++) {
      const g = this.mission.guides[i];
      const active = i === this.guideIndex;
      ctx.save();
      ctx.strokeStyle = COLORS[g.color];
      ctx.globalAlpha = active ? 0.55 : 0.28;
      ctx.lineWidth = Math.max(2, g.width * 0.55);
      ctx.setLineDash(active ? [10, 6] : [4, 6]);
      ctx.beginPath();
      ctx.moveTo(g.a.x, g.a.y);
      ctx.lineTo(g.b.x, g.b.y);
      ctx.stroke();
      if (active) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = COLORS[g.color];
        ctx.beginPath();
        ctx.arc(g.a.x, g.a.y, 3, 0, Math.PI * 2);
        ctx.arc(g.b.x, g.b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  _drawTarget(ctx) {
    const t = this.target;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.fillStyle = this.onTarget ? 'rgba(61,255,138,0.35)' : 'rgba(255,255,255,0.2)';
    ctx.strokeStyle = this.onTarget ? '#3dff8a' : '#f2f4f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-10, -10, 20, 20);
    ctx.fill();
    ctx.stroke();
    // reflective chevron
    ctx.strokeStyle = this.onTarget ? '#3dff8a' : '#f5c518';
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.lineTo(0, -6);
    ctx.lineTo(6, 4);
    ctx.stroke();
    ctx.restore();
  }

  _drawLaser(ctx) {
    if (!this.laserOn) return;
    const tip = this.striper.tip();
    const hx = Math.cos(this.striper.rot);
    const hy = Math.sin(this.striper.rot);
    let endX = tip.x + hx * LASER_RANGE;
    let endY = tip.y + hy * LASER_RANGE;

    if (this.onTarget) {
      endX = this.target.x;
      endY = this.target.y;
    }

    ctx.save();
    ctx.strokeStyle = this.onTarget ? 'rgba(61,255,138,0.95)' : 'rgba(61,255,138,0.55)';
    ctx.lineWidth = this.onTarget ? 2.2 : 1.4;
    ctx.shadowColor = '#3dff8a';
    ctx.shadowBlur = this.onTarget ? 8 : 4;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  screenToWorld(sx, sy) {
    const r = this.canvas.getBoundingClientRect();
    const x = sx - r.left;
    const y = sy - r.top;
    return {
      x: this.cam.x + (x - r.width / 2) / this.cam.zoom,
      y: this.cam.y + (y - r.height / 2) / this.cam.zoom,
    };
  }

  toast(msg) {
    this.hud.toast(msg);
  }

  _bindInput() {
    const down = (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k === ' ') e.preventDefault();

      if (k === 'g') {
        this.laserOn = !this.laserOn;
        this.toast(this.laserOn ? 'Laser ON' : 'Laser OFF');
      } else if (k === 't') {
        this.cycleTarget();
      } else if (k === 'l' || k === 'f') {
        this.tryLock();
      } else if (k === '1') this.setColor('white');
      else if (k === '2') this.setColor('yellow');
      else if (k === '3') this.setColor('blue');
      else if (k === 'enter') this.submitScore();
      else if (k === 'r' && !e.ctrlKey && !e.metaKey) this.clearPaint();
    };
    const up = (e) => this.keys.delete(e.key.toLowerCase());

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        this.cam.zoom = Math.max(0.45, Math.min(4.5, this.cam.zoom * factor));
      },
      { passive: false }
    );

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 1 || e.button === 2 || e.shiftKey || e.altKey) {
        this.dragging = true;
        this.dragLast = { x: e.clientX, y: e.clientY };
        this.canvas.setPointerCapture(e.pointerId);
      } else if (e.button === 0) {
        // LMB also sprays
        this.keys.add(' ');
      }
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging || !this.dragLast) return;
      const dx = e.clientX - this.dragLast.x;
      const dy = e.clientY - this.dragLast.y;
      this.dragLast = { x: e.clientX, y: e.clientY };
      this.cam.x -= dx / this.cam.zoom;
      this.cam.y -= dy / this.cam.zoom;
    });
    const endDrag = (e) => {
      this.dragging = false;
      this.dragLast = null;
      if (e.button === 0) this.keys.delete(' ');
    };
    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', endDrag);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}

function makeCrew(n) {
  const colors = ['#ff4d6d', '#ff8a3d', '#f5c518', '#5b8def'];
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: 400 + Math.random() * 1000,
      y: 700 + Math.random() * 700,
      heading: Math.random() * Math.PI * 2,
      spd: 8 + Math.random() * 14,
      color: colors[i % colors.length],
      t: 0,
      turnIn: 1 + Math.random() * 3,
    });
  }
  return out;
}

export function bindHud() {
  const missionTitle = document.getElementById('mission-title');
  const missionBrief = document.getElementById('mission-brief');
  const scorePill = document.getElementById('score-pill');
  const laserState = document.getElementById('laser-state');
  const targetState = document.getElementById('target-state');
  const lockState = document.getElementById('lock-state');
  const paintState = document.getElementById('paint-state');
  const toastEl = document.getElementById('toast');
  let toastTimer = 0;

  return {
    setMission(m) {
      missionTitle.textContent = m.title;
      missionBrief.textContent = m.brief;
      document.querySelectorAll('.mission-btn').forEach((btn) => {
        btn.classList.toggle('active', Number(btn.dataset.mission) === m.id);
      });
    },
    setScore(coverage, pass) {
      scorePill.classList.remove('pass', 'fail');
      if (coverage == null) {
        scorePill.textContent = 'Coverage —';
        return;
      }
      scorePill.textContent = `Coverage ${coverage}%`;
      scorePill.classList.add(pass ? 'pass' : 'fail');
    },
    setLaser(on, onTarget) {
      laserState.textContent = !on ? 'OFF' : onTarget ? 'ON TARGET' : 'ON';
      laserState.classList.toggle('on', on);
    },
    setTarget(text) {
      targetState.textContent = text;
      targetState.classList.toggle('on', text === 'ON TARGET');
    },
    setLock(locked) {
      lockState.textContent = locked ? 'LOCKED' : 'FREE';
      lockState.classList.toggle('lock', locked);
    },
    setPaint(key) {
      paintState.textContent = key.toUpperCase();
      document.querySelectorAll('.swatch').forEach((s) => {
        s.classList.toggle('active', s.dataset.color === key);
      });
    },
    toast(msg) {
      toastEl.hidden = false;
      toastEl.textContent = msg;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastEl.hidden = true;
      }, 2200);
    },
  };
}
