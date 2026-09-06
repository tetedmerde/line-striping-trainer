import * as THREE from 'three';
import { planToWorld } from './coords.js';
import { COLORS, guideLength, pointOnGuide } from './missions.js';

const DOT_SPACING_PX = 22; // ~1.1 m along guide — AutoLayout-style pre-marks
const PLACE_RATE = 4.2; // dots per second per crew when walking

/**
 * Graco AutoLayout-style crew: little Hookers guys walk the bay and put down
 * pre-mark dots; player later connects them with LazerGuide.
 */
export class LayoutCrew {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'layoutCrew';
    this.dotsRoot = new THREE.Group();
    this.dotsRoot.name = 'layoutDots';
    this.root.add(this.dotsRoot);

    /** @type {'idle'|'layout'|'stripe'} */
    this.phase = 'idle';
    /** @type {LayoutDot[]} */
    this.dots = [];
    /** @type {CrewNpc[]} */
    this.npcs = [];
    this._queue = [];
    this._placed = 0;
    this._progress = 0;
    this.status = 'Stand by';
  }

  /**
   * Start layout phase for mission guides.
   * @param {import('./missions.js').Guide[]} guides
   */
  beginLayout(guides) {
    this.clearDots();
    this._despawnNpcs();
    this.phase = 'layout';
    this._placed = 0;
    this._progress = 0;
    this.dots = buildDotsFromGuides(guides || []);
    this._queue = this.dots.map((_, i) => i);
    // Spawn 2–3 crew
    const n = Math.min(3, Math.max(2, Math.ceil(this.dots.length / 18)));
    for (let i = 0; i < n; i++) {
      this.npcs.push(spawnLayoutNpc(this.root, i));
    }
    // Seed NPC start near first dots
    for (let i = 0; i < this.npcs.length; i++) {
      const di = this._queue[i];
      if (di != null) {
        const d = this.dots[di];
        const w = planToWorld(d.x, d.y);
        this.npcs[i].mesh.position.set(w.x + (i - 1) * 1.2, 0, w.z + 2);
        this.npcs[i].targetDot = di;
      }
    }
    this.status = `LAYOUT — placing ${this.dots.length} pre-mark dots`;
    return this.dots.length;
  }

  /** Skip remaining layout and jump to stripe. */
  skipToStripe() {
    for (const d of this.dots) {
      if (!d.placed) this._placeDotVisual(d);
      d.placed = true;
    }
    this._placed = this.dots.length;
    this._queue = [];
    this.phase = 'stripe';
    this.status = 'STRIPE — connect the dots with LazerGuide';
    this._idleNpcs();
  }

  clearDots() {
    while (this.dotsRoot.children.length) {
      const c = this.dotsRoot.children[0]; this.dotsRoot.remove(c);
      c.geometry?.dispose?.();
      c.material?.dispose?.();
    }
    this.dots = [];
    this._queue = [];
    this._placed = 0;
  }

  _despawnNpcs() {
    for (const n of this.npcs) {
      this.root.remove(n.mesh);
    }
    this.npcs = [];
  }

  _idleNpcs() {
    // Keep them on lot, milling near last dots
    for (const n of this.npcs) {
      n.targetDot = null;
      n.placing = false;
      n.idle = true;
    }
  }

  /**
   * @param {number} dt
   * @returns {{justFinished?:boolean, placed?:number}}
   */
  update(dt) {
    if (this.phase !== 'layout') {
      for (const n of this.npcs) this._updateNpcIdle(n, dt);
      return {};
    }

    let placedThis = 0;
    for (const npc of this.npcs) {
      if (npc.targetDot == null) {
        const next = this._queue.shift();
        if (next == null) {
          npc.idle = true;
          continue;
        }
        npc.targetDot = next;
        npc.idle = false;
        npc.placing = false;
      }
      const dot = this.dots[npc.targetDot];
      if (!dot || dot.placed) {
        npc.targetDot = null;
        continue;
      }
      const w = planToWorld(dot.x, dot.y);
      const mx = npc.mesh.position.x;
      const mz = npc.mesh.position.z;
      const dx = w.x - mx;
      const dz = w.z - mz;
      const dist = Math.hypot(dx, dz);
      npc.mesh.rotation.y = Math.atan2(dx, dz);
      if (dist > 0.35) {
        const spd = 3.4;
        const step = Math.min(dist, spd * dt);
        npc.mesh.position.x += (dx / dist) * step;
        npc.mesh.position.z += (dz / dist) * step;
        npc.mesh.position.y = Math.abs(Math.sin(performance.now() * 0.012)) * 0.05;
        npc.placing = false;
      } else {
        // Place
        npc.placing = true;
        npc.placeTimer = (npc.placeTimer || 0) + dt;
        // Kneel bob
        npc.mesh.position.y = -0.02;
        if (npc.placeTimer > 1 / PLACE_RATE) {
          npc.placeTimer = 0;
          if (!dot.placed) {
            this._placeDotVisual(dot);
            dot.placed = true;
            this._placed += 1;
            placedThis += 1;
          }
          npc.targetDot = null;
        }
      }
    }

    this._progress = this.dots.length ? this._placed / this.dots.length : 1;
    this.status = `LAYOUT ${Math.round(this._progress * 100)}% · ${this._placed}/${this.dots.length} dots`;

    if (this._placed >= this.dots.length && this.dots.length > 0) {
      this.phase = 'stripe';
      this.status = 'STRIPE — aim laser through dots, lock, coat';
      this._idleNpcs();
      return { justFinished: true, placed: this._placed };
    }
    return { placed: placedThis };
  }

  _updateNpcIdle(npc, dt) {
    if (!npc.idle) return;
    npc.t = (npc.t || 0) + dt;
    npc.mesh.position.y = Math.sin(npc.t * 2) * 0.015;
    if (npc.t > (npc.turnIn || 3)) {
      npc.heading = (npc.heading || 0) + (Math.random() - 0.5) * 1.4;
      npc.t = 0;
      npc.turnIn = 2 + Math.random() * 3;
    }
    const h = npc.heading || 0;
    npc.mesh.position.x += Math.cos(h) * 0.4 * dt;
    npc.mesh.position.z += Math.sin(h) * 0.4 * dt;
    npc.mesh.rotation.y = Math.atan2(Math.cos(h), Math.sin(h));
  }

  _placeDotVisual(dot) {
    const color = COLORS[dot.color] || COLORS.yellow;
    const w = planToWorld(dot.x, dot.y);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.15,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.35,
    });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.04, 10), mat);
    mesh.position.set(w.x, 0.03, w.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.dotId = dot.id;
    this.dotsRoot.add(mesh);
    dot.mesh = mesh;

    // Flat paint blotch on asphalt
    const blotch = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 12),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    blotch.rotation.x = -Math.PI / 2;
    blotch.position.set(w.x, 0.028, w.z);
    this.dotsRoot.add(blotch);
  }

  get progress() {
    return this._progress;
  }

  get placedCount() {
    return this._placed;
  }

  get totalDots() {
    return this.dots.length;
  }

  /** Placed dots only, for laser snap / scoring. */
  placedDots() {
    return this.dots.filter((d) => d.placed);
  }

  /**
   * Find best guide segment for laser snap: tip aiming along heading toward
   * a consecutive placed-dot pair (or helper target already handled elsewhere).
   * Returns guide-like {a,b,color,width,id} from nearest aligned dot pair, or null.
   */
  snapGuideFromLaser(tipPlan, heading, maxRange = 420, maxMiss = 18) {
    const hx = Math.cos(heading);
    const hy = Math.sin(heading);
    const byGuide = new Map();
    for (const d of this.dots) {
      if (!d.placed) continue;
      if (!byGuide.has(d.guideId)) byGuide.set(d.guideId, []);
      byGuide.get(d.guideId).push(d);
    }
    let best = null;
    let bestScore = Infinity;

    for (const [, list] of byGuide) {
      list.sort((a, b) => a.t - b.t);
      for (let i = 0; i < list.length - 1; i++) {
        const a = list[i];
        const b = list[i + 1];
        // Midpoint of segment — check if laser ray passes near it / along it
        const midX = (a.x + b.x) * 0.5;
        const midY = (a.y + b.y) * 0.5;
        const toMx = midX - tipPlan.x;
        const toMy = midY - tipPlan.y;
        const along = toMx * hx + toMy * hy;
        if (along < 5 || along > maxRange) continue;
        const closestX = tipPlan.x + hx * along;
        const closestY = tipPlan.y + hy * along;
        const miss = Math.hypot(midX - closestX, midY - closestY);
        if (miss > maxMiss) continue;
        // Prefer alignment with segment direction
        const sdx = b.x - a.x;
        const sdy = b.y - a.y;
        const slen = Math.hypot(sdx, sdy) || 1;
        const align = Math.abs((sdx / slen) * hx + (sdy / slen) * hy);
        if (align < 0.72) continue;
        const score = miss - align * 8;
        if (score < bestScore) {
          bestScore = score;
          best = {
            id: `${a.guideId}-seg-${i}`,
            color: a.color,
            width: a.width || 4,
            a: { x: a.x, y: a.y },
            b: { x: b.x, y: b.y },
            label: 'dot-seg',
            fromDots: true,
            guideId: a.guideId,
          };
        }
      }
      // Also allow full guide a→b from first/last dot
      if (list.length >= 2) {
        const a = list[0];
        const b = list[list.length - 1];
        const toBx = b.x - tipPlan.x;
        const toBy = b.y - tipPlan.y;
        const along = toBx * hx + toBy * hy;
        if (along > 8 && along < maxRange) {
          const closestX = tipPlan.x + hx * along;
          const closestY = tipPlan.y + hy * along;
          const miss = Math.hypot(b.x - closestX, b.y - closestY);
          if (miss <= maxMiss + 6) {
            const sdx = b.x - a.x;
            const sdy = b.y - a.y;
            const slen = Math.hypot(sdx, sdy) || 1;
            const align = Math.abs((sdx / slen) * hx + (sdy / slen) * hy);
            if (align >= 0.7) {
              const score = miss - align * 10;
              if (score < bestScore) {
                bestScore = score;
                best = {
                  id: a.guideId,
                  color: a.color,
                  width: a.width || 4,
                  a: { x: a.x, y: a.y },
                  b: { x: b.x, y: b.y },
                  label: 'dot-run',
                  fromDots: true,
                  guideId: a.guideId,
                };
              }
            }
          }
        }
      }
    }
    return best;
  }

  /**
   * Scoring weight: samples near placed dots count extra when painted.
   */
  scoreDotBonus(paintLayer, radius = 7) {
    const placed = this.placedDots();
    if (!placed.length) return { hit: 0, total: 0, bonus: 0 };
    let hit = 0;
    for (const d of placed) {
      if (
        paintLayer._sampleHasColor(
          paintLayer.ctx,
          d.x,
          d.y,
          radius,
          paintLayer.width,
          paintLayer.height,
          d.color,
          null
        )
      ) {
        hit += 1;
      }
    }
    const pct = Math.round((hit / placed.length) * 100);
    return { hit, total: placed.length, bonus: pct };
  }
}

/**
 * @typedef {{id:string, guideId:string, x:number, y:number, t:number, color:string, width:number, placed:boolean, mesh?:THREE.Object3D}} LayoutDot
 * @typedef {{mesh:THREE.Group, targetDot:number|null, placing:boolean, idle:boolean, placeTimer:number, heading:number, t:number, turnIn:number}} CrewNpc
 */

function buildDotsFromGuides(guides) {
  /** @type {LayoutDot[]} */
  const dots = [];
  let n = 0;
  for (const g of guides) {
    const len = guideLength(g) || 1;
    const steps = Math.max(1, Math.round(len / DOT_SPACING_PX));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = pointOnGuide(g, t);
      dots.push({
        id: `dot-${n++}`,
        guideId: g.id,
        x: p.x,
        y: p.y,
        t,
        color: g.color,
        width: g.width || 4,
        placed: false,
      });
    }
  }
  return dots;
}

function spawnLayoutNpc(parent, index) {
  const colors = [0xff4d6d, 0xff8a3d, 0xf5c518];
  const g = new THREE.Group();
  const vest = new THREE.MeshStandardMaterial({
    color: colors[index % colors.length],
    roughness: 0.55,
    metalness: 0.1,
    emissive: colors[index % colors.length],
    emissiveIntensity: 0.08,
  });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.75 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 });
  const hatMat = new THREE.MeshStandardMaterial({
    color: 0xf5c518,
    roughness: 0.4,
    metalness: 0.2,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.26), vest);
  torso.position.y = 1.0;
  torso.castShadow = true;
  g.add(torso);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.5, 0.22), pants);
  legs.position.y = 0.48;
  g.add(legs);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), skin);
  head.position.y = 1.4;
  g.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.12, 12), hatMat);
  hat.position.y = 1.54;
  g.add(hat);

  // Dot marker stick / chalk bottle in hand
  const chalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.035, 0.28, 8),
    new THREE.MeshStandardMaterial({ color: 0xf2f4f7, roughness: 0.4 })
  );
  chalk.position.set(0.22, 0.95, 0.12);
  chalk.rotation.z = 0.4;
  g.add(chalk);

  const sh = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  g.add(sh);

  parent.add(g);
  return {
    mesh: g,
    targetDot: null,
    placing: false,
    idle: false,
    placeTimer: 0,
    heading: Math.random() * Math.PI * 2,
    t: 0,
    turnIn: 2,
  };
}
