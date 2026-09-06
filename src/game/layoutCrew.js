import * as THREE from 'three';
import { planToWorld } from './coords.js';
import { COLORS } from './missions.js';

/**
 * Endpoint marks only (start + stop per stripe / bay run).
 * No AutoLayout parade — dots appear immediately; crew idles on the lot.
 */
export class LayoutCrew {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'layoutCrew';
    this.dotsRoot = new THREE.Group();
    this.dotsRoot.name = 'layoutDots';
    this.root.add(this.dotsRoot);

    /** @type {'idle'|'stripe'} */
    this.phase = 'idle';
    /** @type {LayoutDot[]} */
    this.dots = [];
    /** @type {CrewNpc[]} */
    this.npcs = [];
    this._guides = [];
    this._activeGuideId = null;
    this.status = 'Stand by';
  }

  /**
   * Instant endpoint marks for all guides; idle crew near the lot.
   * @param {import('./missions.js').Guide[]} guides
   * @param {number} [activeIndex=0]
   */
  beginStripe(guides, activeIndex = 0) {
    this.clearDots();
    this._despawnNpcs();
    this.phase = 'stripe';
    this._guides = guides || [];
    this.dots = buildEndpointDots(this._guides);
    for (const d of this.dots) {
      this._placeDotVisual(d);
      d.placed = true;
    }
    this._spawnIdleCrew();
    this.setActiveRun(activeIndex);
    return this.dots.length;
  }

  /** @deprecated use beginStripe — kept so old call sites fail loudly if missed */
  beginLayout(guides) {
    return this.beginStripe(guides, 0);
  }

  skipToStripe() {
    // no-op: already in stripe
    this.phase = 'stripe';
  }

  /**
   * Highlight start/stop for the locked / helper-active run.
   * @param {number} guideIndex
   */
  setActiveRun(guideIndex) {
    const g = this._guides[guideIndex];
    this._activeGuideId = g?.id ?? null;
    for (const d of this.dots) {
      const active = d.guideId === this._activeGuideId;
      if (d.mesh) {
        d.mesh.scale.setScalar(active ? 1.2 : 0.9);
        if (d.mesh.material?.emissiveIntensity != null) {
          d.mesh.material.emissiveIntensity = active ? 0.22 : 0.08;
        }
      }
      if (d.blotch?.material) {
        d.blotch.material.opacity = active ? 0.95 : 0.45;
      }
    }
    if (g) {
      this.status = `Marks · ${g.label || g.id} start→stop`;
    } else {
      this.status = `Marks · ${this.dots.length} endpoints`;
    }
  }

  clearDots() {
    while (this.dotsRoot.children.length) {
      const c = this.dotsRoot.children[0];
      this.dotsRoot.remove(c);
      c.geometry?.dispose?.();
      c.material?.dispose?.();
    }
    this.dots = [];
  }

  _despawnNpcs() {
    for (const n of this.npcs) {
      this.root.remove(n.mesh);
    }
    this.npcs = [];
  }

  _spawnIdleCrew() {
    const n = 2;
    // Park near first guide start if available
    let baseX = 600;
    let baseY = 1100;
    const g0 = this._guides[0];
    if (g0) {
      baseX = g0.a.x;
      baseY = g0.a.y;
    }
    for (let i = 0; i < n; i++) {
      const npc = spawnIdleNpc(this.root, i);
      const w = planToWorld(baseX + (i - 0.5) * 40, baseY + 55 + i * 20);
      npc.mesh.position.set(w.x, 0, w.z);
      npc.idle = true;
      npc.heading = Math.random() * Math.PI * 2;
      this.npcs.push(npc);
    }
  }

  /**
   * @param {number} dt
   * @returns {{}}
   */
  update(dt) {
    for (const n of this.npcs) this._updateNpcIdle(n, dt);
    return {};
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
    npc.mesh.position.x += Math.cos(h) * 0.35 * dt;
    npc.mesh.position.z += Math.sin(h) * 0.35 * dt;
    npc.mesh.rotation.y = Math.atan2(Math.cos(h), Math.sin(h));
  }

  _placeDotVisual(dot) {
    const color = COLORS[dot.color] || COLORS.yellow;
    const w = planToWorld(dot.x, dot.y);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.05,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.12,
    });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.035, 12), mat);
    mesh.position.set(w.x, 0.035, w.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.dotId = dot.id;
    mesh.userData.kind = dot.kind;
    this.dotsRoot.add(mesh);
    dot.mesh = mesh;

    const blotch = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 14),
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
    dot.blotch = blotch;
  }

  get progress() {
    return 1;
  }

  get placedCount() {
    return this.dots.filter((d) => d.placed).length;
  }

  get totalDots() {
    return this.dots.length;
  }

  placedDots() {
    return this.dots.filter((d) => d.placed);
  }

  /**
   * Laser snap onto a start→stop endpoint pair (full bay run).
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

    for (const [guideId, list] of byGuide) {
      list.sort((a, b) => a.t - b.t);
      if (list.length < 2) continue;
      const a = list[0];
      const b = list[list.length - 1];
      const midX = (a.x + b.x) * 0.5;
      const midY = (a.y + b.y) * 0.5;
      const toMx = midX - tipPlan.x;
      const toMy = midY - tipPlan.y;
      const alongMid = toMx * hx + toMy * hy;
      if (alongMid > 5 && alongMid < maxRange) {
        const closestX = tipPlan.x + hx * alongMid;
        const closestY = tipPlan.y + hy * alongMid;
        const miss = Math.hypot(midX - closestX, midY - closestY);
        const sdx = b.x - a.x;
        const sdy = b.y - a.y;
        const slen = Math.hypot(sdx, sdy) || 1;
        const align = Math.abs((sdx / slen) * hx + (sdy / slen) * hy);
        if (miss <= maxMiss && align >= 0.72) {
          const score = miss - align * 8 + (guideId === this._activeGuideId ? -4 : 0);
          if (score < bestScore) {
            bestScore = score;
            best = {
              id: guideId,
              color: a.color,
              width: a.width || 4,
              a: { x: a.x, y: a.y },
              b: { x: b.x, y: b.y },
              label: 'endpoint-run',
              fromDots: true,
              guideId,
            };
          }
        }
      }
      // Prefer aiming at the stop mark
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
            const score = miss - align * 10 + (guideId === this._activeGuideId ? -4 : 0);
            if (score < bestScore) {
              bestScore = score;
              best = {
                id: guideId,
                color: a.color,
                width: a.width || 4,
                a: { x: a.x, y: a.y },
                b: { x: b.x, y: b.y },
                label: 'endpoint-run',
                fromDots: true,
                guideId,
              };
            }
          }
        }
      }
    }
    return best;
  }

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
 * @typedef {{id:string, guideId:string, x:number, y:number, t:number, color:string, width:number, kind:string, placed:boolean, mesh?:THREE.Object3D, blotch?:THREE.Object3D}} LayoutDot
 * @typedef {{mesh:THREE.Group, idle:boolean, heading:number, t:number, turnIn:number}} CrewNpc
 */

function buildEndpointDots(guides) {
  /** @type {LayoutDot[]} */
  const dots = [];
  let n = 0;
  for (const g of guides) {
    for (const [t, kind] of [
      [0, 'start'],
      [1, 'stop'],
    ]) {
      const x = g.a.x + (g.b.x - g.a.x) * t;
      const y = g.a.y + (g.b.y - g.a.y) * t;
      dots.push({
        id: `dot-${n++}`,
        guideId: g.id,
        x,
        y,
        t,
        color: g.color,
        width: g.width || 4,
        kind,
        placed: false,
      });
    }
  }
  return dots;
}

function spawnIdleNpc(parent, index) {
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
    idle: true,
    heading: Math.random() * Math.PI * 2,
    t: 0,
    turnIn: 2,
  };
}
