import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { COLORS, PASS_THRESHOLD, getMission } from './missions.js';
import { PaintLayer } from './paint.js';
import { Striper } from './striper.js';
import { HelperCrew } from './helper.js';
import { createWorld, createGuideMeshes, setActiveGuideMesh } from './world.js';
import { GameCamera } from './camera.js';
import { planToWorld } from './coords.js';

const LASER_RANGE_PX = 420;
const TARGET_HIT_RADIUS = 22;

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {ReturnType<typeof bindHud>} hud
   */
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.hud = hud;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      55,
      (canvas.clientWidth || 1) / (canvas.clientHeight || 1),
      0.1,
      400
    );
    this.camCtrl = new GameCamera(this.camera);

    this.composer = null;
    this.world = null;
    this.guideGroup = null;

    this.paint = new PaintLayer();
    this.striper = new Striper();
    this.helper = new HelperCrew();

    this.laserLine = null;
    this.laserGlow = null;

    this.mission = getMission(1);
    this.laserOn = true;
    this.onTarget = false;
    this.laserHitGuide = null;
    this.colorKey = 'yellow';
    this.spraying = false;
    this.lastScore = null;

    this.keys = new Set();
    this.crewAmbient = [];
    this.running = false;
    this._raf = 0;
    this._last = 0;
    this._laserState = 'AIMING';

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this._bindInput();
  }

  async load() {
    this.world = await createWorld(this.scene, this.renderer);
    this._setupPost();

    this.scene.add(this.striper.root);
    this.scene.add(this.helper.root);

    // Laser beam (line + soft glow sprite optional)
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(0, 0, 1),
    ]);
    this.laserLine = new THREE.Line(
      laserGeo,
      new THREE.LineBasicMaterial({
        color: 0x3dff8a,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    this.laserLine.frustumCulled = false;
    this.scene.add(this.laserLine);

    // Ambient paint-crew NPCs (non-NSFW)
    this.crewAmbient = makeAmbientCrew(this.scene, 8);

    this.setMission(1);
  }

  _setupPost() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.18, 0.4, 0.85);
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this.update(dt);
      this.render();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  setMission(id) {
    this.mission = getMission(id);
    this.paint.clear();
    if (this.mission.allowedColors?.length) {
      this.setColor(this.mission.allowedColors[0]);
    } else {
      this.paint.setColor(this.colorKey);
    }

    this.striper.unlock();
    this.lastScore = null;

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

    this.helper.setGuides(this.mission.guides);
    this.helper.placeForTip(this.striper.tip());

    if (this.guideGroup) this.scene.remove(this.guideGroup);
    this.guideGroup = createGuideMeshes(this.mission.guides, this.helper.guideIndex);
    this.scene.add(this.guideGroup);

    this.hud.setMission(this.mission);
    this.hud.setScore(null);
    this.hud.setHelper(this.helper.status);
    this.toast(`Mission: ${this.mission.title}`);
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
    if (this.world) this.world.updatePaint();
    this.toast('Paint cleared');
  }

  update(dt) {
    const input = {
      forward:
        (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0) -
        (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0),
      turn:
        (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) -
        (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0),
      precision: this.keys.has('shift'),
    };

    this.spraying = this.keys.has(' ') || this.keys.has('space');
    this.striper.update(dt, input);

    // Helper call forward/back (H hold + ]/[ or just hold period/comma already nudges)
    if (this.keys.has('=') || this.keys.has('h')) {
      // H alone: call helper toward far end relative to tip
      const tip = this.striper.tip();
      const tpos = this.helper.getTargetPlan();
      const g = this.helper.guide;
      if (g) {
        const proj = tip;
        // walk target away from tip along guide
        const tipT =
          ((proj.x - g.a.x) * (g.b.x - g.a.x) + (proj.y - g.a.y) * (g.b.y - g.a.y)) /
          (((g.b.x - g.a.x) ** 2 + (g.b.y - g.a.y) ** 2) || 1);
        const dir = this.helper.targetT >= tipT ? 1 : -1;
        this.helper.callAlong(dir, dt);
      }
    }
    if (this.keys.has('-') || this.keys.has('_')) {
      const tip = this.striper.tip();
      const g = this.helper.guide;
      if (g) {
        const tipT =
          ((tip.x - g.a.x) * (g.b.x - g.a.x) + (tip.y - g.a.y) * (g.b.y - g.a.y)) /
          (((g.b.x - g.a.x) ** 2 + (g.b.y - g.a.y) ** 2) || 1);
        const dir = this.helper.targetT >= tipT ? -1 : 1;
        this.helper.callAlong(dir, dt);
      }
    }

    // Auto-advance helper while striping
    const adv = this.helper.autoAdvance(
      this.striper.tip(),
      this.striper.locked,
      this.spraying,
      dt
    );
    if (adv?.changedGuide) {
      setActiveGuideMesh(this.guideGroup, this.helper.guideIndex);
      if (this.striper.locked) {
        this.striper.unlock();
        this.hud.setLock(false);
        this.toast(adv.unlockedHint || 'Helper moved target — re-lock');
      }
    }

    this.helper.update(dt);
    this._updateLaser();
    this.helper.setOnTarget(this.onTarget);

    this.paint.spray(this.striper.tip(), this.spraying && this.running, this.striper.locked);
    if (this.paint.dirty && this.world) {
      this.world.updatePaint();
      this.paint.dirty = false;
    }

    this.camCtrl.update(this.striper, dt);
    this._updateLaserVisual();

    for (const c of this.crewAmbient) {
      c.t += dt;
      c.mesh.position.x += Math.cos(c.heading) * c.spd * dt;
      c.mesh.position.z += Math.sin(c.heading) * c.spd * dt;
      c.mesh.rotation.y = Math.atan2(Math.cos(c.heading), Math.sin(c.heading));
      if (c.t > c.turnIn) {
        c.heading += (Math.random() - 0.5) * 1.2;
        c.t = 0;
        c.turnIn = 2 + Math.random() * 4;
      }
    }

    this._laserState = !this.laserOn
      ? 'OFF'
      : this.striper.locked
        ? 'LOCKED'
        : this.onTarget
          ? 'ON TARGET'
          : 'AIMING';
    this.hud.setLaser(this.laserOn, this.onTarget, this._laserState);
    this.hud.setTarget(this.onTarget ? 'ON TARGET' : 'SEEK');
    this.hud.setLock(this.striper.locked);
    this.hud.setHelper(this.helper.status);
    this.hud.setCam(this.camCtrl.mode);
  }

  _updateLaser() {
    this.onTarget = false;
    this.laserHitGuide = null;
    if (!this.laserOn) return;

    const tip = this.striper.tip();
    const hx = Math.cos(this.striper.rot);
    const hy = Math.sin(this.striper.rot);
    const target = this.helper.getTargetPlan();

    const toTx = target.x - tip.x;
    const toTy = target.y - tip.y;
    const along = toTx * hx + toTy * hy;
    if (along > 8 && along < LASER_RANGE_PX) {
      const closestX = tip.x + hx * along;
      const closestY = tip.y + hy * along;
      const miss = Math.hypot(target.x - closestX, target.y - closestY);
      if (miss <= TARGET_HIT_RADIUS) {
        this.onTarget = true;
        this.laserHitGuide = this.helper.guide || this.mission.guides[this.helper.guideIndex];
      }
    }
  }

  _updateLaserVisual() {
    if (!this.laserLine) return;
    this.laserLine.visible = this.laserOn;
    if (!this.laserOn) return;

    const tipW = this.striper.tipWorld();
    const hx = Math.cos(this.striper.rot);
    const hy = Math.sin(this.striper.rot);
    let endPlan = {
      x: this.striper.tip().x + hx * LASER_RANGE_PX,
      y: this.striper.tip().y + hy * LASER_RANGE_PX,
    };
    if (this.onTarget) {
      endPlan = this.helper.getTargetPlan();
    }
    const endW = planToWorld(endPlan.x, endPlan.y);
    const positions = this.laserLine.geometry.attributes.position;
    // Raise beam slightly above asphalt
    positions.setXYZ(0, tipW.x, 0.35, tipW.z);
    positions.setXYZ(1, endW.x, 0.45, endW.z);
    positions.needsUpdate = true;
    this.laserLine.material.opacity = this.onTarget ? 0.95 : 0.55;
    this.laserLine.material.color.setHex(this.striper.locked ? 0xf5c518 : 0x3dff8a);
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    if (this.composer) this.composer.setSize(w, h);
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
        const prevGuide = this.helper.guide;
        const res = this.helper.cycleGuide(this.striper.tip());
        setActiveGuideMesh(this.guideGroup, this.helper.guideIndex);
        if (this.striper.locked && res.changedGuide) {
          this.striper.unlock();
          this.hud.setLock(false);
          this.toast('Helper moved target — re-lock');
        } else {
          this.toast(`Target → guide ${this.helper.guideIndex + 1}/${this.mission.guides.length}`);
        }
        void prevGuide;
      } else if (k === 'l' || k === 'f') {
        this.tryLock();
      } else if (k === '[' || k === ',') {
        this.helper.nudge(-0.06);
        this.hud.setHelper(this.helper.status);
      } else if (k === ']' || k === '.') {
        this.helper.nudge(0.06);
        this.hud.setHelper(this.helper.status);
      } else if (k === 'v') {
        const mode = this.camCtrl.toggleTop();
        this.toast(mode === 'top' ? 'Top-down assist' : 'Chase cam');
      } else if (k === 'c') {
        const mode = this.camCtrl.toggleShoulder();
        this.toast(mode === 'shoulder' ? 'Shoulder cam' : 'Chase cam');
      } else if (k === '1') this.setColor('white');
      else if (k === '2') this.setColor('yellow');
      else if (k === '3') this.setColor('blue');
      else if (k === 'enter') this.submitScore();
      else if (k === 'r' && !e.ctrlKey && !e.metaKey) this.clearPaint();
    };
    const up = (e) => this.keys.delete(e.key.toLowerCase());

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) this.keys.add(' ');
    });
    this.canvas.addEventListener('pointerup', (e) => {
      if (e.button === 0) this.keys.delete(' ');
    });
  }
}

function makeAmbientCrew(scene, n) {
  const colors = [0xff4d6d, 0xff8a3d, 0xf5c518, 0x5b8def];
  const out = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: colors[i % colors.length],
      roughness: 0.7,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 4, 8), mat);
    body.position.y = 0.85;
    body.castShadow = true;
    g.add(body);
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.12, 10),
      new THREE.MeshStandardMaterial({ color: 0xf5c518 })
    );
    hat.position.y = 1.4;
    g.add(hat);
    const px = 500 + Math.random() * 900;
    const py = 900 + Math.random() * 500;
    const w = planToWorld(px, py);
    g.position.set(w.x, 0, w.z);
    scene.add(g);
    out.push({
      mesh: g,
      heading: Math.random() * Math.PI * 2,
      spd: 0.6 + Math.random() * 0.9,
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
  const helperState = document.getElementById('helper-state');
  const camState = document.getElementById('cam-state');
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
    setLaser(on, onTarget, label) {
      laserState.textContent = label || (!on ? 'OFF' : onTarget ? 'ON TARGET' : 'AIMING');
      laserState.classList.toggle('on', on);
      laserState.classList.toggle('lock', label === 'LOCKED');
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
    setHelper(text) {
      if (helperState) helperState.textContent = text || '—';
    },
    setCam(mode) {
      if (camState) camState.textContent = (mode || 'chase').toUpperCase();
    },
    toast(msg) {
      toastEl.hidden = false;
      toastEl.textContent = msg;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastEl.hidden = true;
      }, 2400);
    },
  };
}
