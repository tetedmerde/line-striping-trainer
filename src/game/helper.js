import * as THREE from 'three';
import { planToWorld } from './coords.js';
import { guideLength, pointOnGuide, projectOnGuide } from './missions.js';

/**
 * Hookers paint-crew helper who carries the reflective LazerGuide target box.
 * Advances along the current guide / next bay as the player stripes.
 */
export class HelperCrew {
  constructor() {
    this.guideIndex = 0;
    /** 0..1 along active guide — where the target box sits */
    this.targetT = 1;
    this.guides = [];
    this.status = 'Holding target';
    this.moving = false;
    this._walk = 0;
    this._autoCooldown = 0;

    this.root = new THREE.Group();
    this.root.name = 'helper';
    this.targetMesh = null;
    this._build();
  }

  _build() {
    const vest = new THREE.MeshStandardMaterial({
      color: 0xff8a3d,
      roughness: 0.55,
      metalness: 0.1,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.75 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 });
    const hardhat = new THREE.MeshStandardMaterial({
      color: 0xf5c518,
      roughness: 0.4,
      metalness: 0.2,
    });
    const boot = new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.9 });

    // Body
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.28), vest);
    torso.position.y = 1.05;
    torso.castShadow = true;
    this.root.add(torso);

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.55, 0.24), pants);
    legs.position.y = 0.5;
    legs.castShadow = true;
    this.root.add(legs);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), skin);
    head.position.y = 1.48;
    head.castShadow = true;
    this.root.add(head);

    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.14, 14), hardhat);
    hat.position.y = 1.62;
    this.root.add(hat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 14), hardhat);
    brim.position.y = 1.55;
    this.root.add(brim);

    // Boots
    for (const x of [-0.1, 0.1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.22), boot);
      b.position.set(x, 0.08, 0.02);
      this.root.add(b);
    }

    // Arms holding box
    const armMat = vest;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), armMat);
    armL.position.set(-0.28, 1.05, 0.18);
    armL.rotation.x = -0.6;
    this.root.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.28;
    this.root.add(armR);

    // Reflective target box
    const boxGroup = new THREE.Group();
    boxGroup.name = 'targetBox';
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xf2f4f7,
      roughness: 0.25,
      metalness: 0.55,
      emissive: 0x334455,
      emissiveIntensity: 0.15,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.12), boxMat);
    box.castShadow = true;
    boxGroup.add(box);

    // Reflective chevron
    const chev = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.2, 3),
      new THREE.MeshStandardMaterial({
        color: 0xf5c518,
        emissive: 0xf5c518,
        emissiveIntensity: 0.12,
        roughness: 0.3,
      })
    );
    chev.rotation.z = Math.PI;
    chev.position.set(0, 0.02, 0.08);
    boxGroup.add(chev);

    // Glow ring (laser hit feedback — toggled from Game)
    this.glow = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.42, 24),
      new THREE.MeshBasicMaterial({
        color: 0x3dff8a,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.glow.position.z = 0.07;
    boxGroup.add(this.glow);

    boxGroup.position.set(0, 1.0, 0.38);
    this.root.add(boxGroup);
    this.targetMesh = boxGroup;

    // Soft shadow
    const sh = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false })
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.02;
    this.root.add(sh);
  }

  setGuides(guides) {
    this.guides = guides || [];
    this.guideIndex = 0;
    this.targetT = 1;
    this.status = 'Holding target at guide end';
    this.moving = false;
    this._placeAtTarget();
  }

  get guide() {
    return this.guides[this.guideIndex] || null;
  }

  /** Target position in plan pixels */
  getTargetPlan() {
    const g = this.guide;
    if (!g) return { x: 0, y: 0 };
    return pointOnGuide(g, this.targetT);
  }

  /** Prefer far end relative to tip when placing initially */
  placeForTip(tipPlan) {
    const g = this.guide;
    if (!g) return;
    const da = Math.hypot(g.a.x - tipPlan.x, g.a.y - tipPlan.y);
    const db = Math.hypot(g.b.x - tipPlan.x, g.b.y - tipPlan.y);
    // target at far end
    this.targetT = db >= da ? 1 : 0;
    this._orientTowardNear(tipPlan);
    this._placeAtTarget();
    this.status = `Target on guide ${this.guideIndex + 1}/${this.guides.length}`;
  }

  cycleGuide(tipPlan) {
    if (!this.guides.length) return { changedGuide: false };
    const prev = this.guideIndex;
    this.guideIndex = (this.guideIndex + 1) % this.guides.length;
    this.placeForTip(tipPlan);
    this.status = `Moved to guide ${this.guideIndex + 1}/${this.guides.length}`;
    return { changedGuide: this.guideIndex !== prev, guideIndex: this.guideIndex };
  }

  /**
   * Nudge target along current guide.
   * @param {number} deltaT signed step in t (e.g. ±0.05)
   */
  nudge(deltaT) {
    if (!this.guide) return;
    this.targetT = Math.max(0, Math.min(1, this.targetT + deltaT));
    this.moving = true;
    this.status = 'Helper nudging target…';
    this._placeAtTarget();
  }

  /**
   * Call helper forward/back along guide (hold keys).
   * @param {number} dir +1 toward higher t, -1 toward lower
   * @param {number} dt
   */
  callAlong(dir, dt) {
    if (!this.guide) return;
    const len = guideLength(this.guide) || 1;
    // ~2.5 m/s walk in plan px
    const speedT = ((2.5 / 0.05) * dt) / len;
    this.targetT = Math.max(0, Math.min(1, this.targetT + dir * speedT));
    this.moving = true;
    this.status = dir > 0 ? 'Helper walking target forward…' : 'Helper walking target back…';
    this._placeAtTarget();
  }

  /**
   * Auto-advance while locked+spraying:
   * - Keep target ahead of tip on long guides
   * - Jump to next bay when tip finishes current guide
   * @returns {{changedGuide:boolean, unlockedHint?:string}|null}
   */
  autoAdvance(tipPlan, locked, spraying, dt) {
    this._autoCooldown = Math.max(0, this._autoCooldown - dt);
    if (!this.guide || !locked || !spraying) {
      if (!this.moving) this.status = this._idleStatus();
      return null;
    }

    const g = this.guide;
    const proj = projectOnGuide(g, tipPlan);
    const tipT = proj.t;
    const len = guideLength(g) || 1;
    const lenM = len * 0.05;

    // Direction: which way is "toward target"
    const towardHigher = this.targetT >= tipT;
    const aheadDistT = Math.abs(this.targetT - tipT);
    const aheadM = aheadDistT * lenM;

    // Keep target ~12–18 m ahead on long runs
    const desiredLeadM = Math.min(16, Math.max(8, lenM * 0.45));
    const desiredLeadT = desiredLeadM / lenM;

    if (lenM > 6 && aheadM < desiredLeadM * 0.55 && this._autoCooldown <= 0) {
      const newT = towardHigher
        ? Math.min(1, tipT + desiredLeadT)
        : Math.max(0, tipT - desiredLeadT);
      if (Math.abs(newT - this.targetT) > 0.01) {
        this.targetT = newT;
        this.moving = true;
        this.status = 'Helper advancing target…';
        this._placeAtTarget();
        this._autoCooldown = 0.35;
      }
    }

    // Near end of guide — advance to next bay
    const nearEnd =
      (towardHigher && tipT > 0.92 && this.targetT > 0.85) ||
      (!towardHigher && tipT < 0.08 && this.targetT < 0.15);

    if (nearEnd && this._autoCooldown <= 0 && this.guides.length > 1) {
      const prevIdx = this.guideIndex;
      this.guideIndex = (this.guideIndex + 1) % this.guides.length;
      this.placeForTip(tipPlan);
      this.moving = true;
      this.status = `Helper moved to next bay (${this.guideIndex + 1}/${this.guides.length})`;
      this._autoCooldown = 1.2;
      return {
        changedGuide: this.guideIndex !== prevIdx,
        unlockedHint: 'Helper moved target — re-lock',
        guideIndex: this.guideIndex,
      };
    }

    return null;
  }

  setOnTarget(on) {
    if (this.glow) {
      this.glow.material.opacity = on ? 0.85 : 0.0;
      this.glow.material.color.setHex(on ? 0x3dff8a : 0xf5c518);
    }
    if (this.targetMesh) {
      const box = this.targetMesh.children[0];
      if (box && box.material) {
        box.material.emissiveIntensity = on ? 0.55 : 0.15;
        box.material.emissive.setHex(on ? 0x3dff8a : 0x334455);
      }
    }
  }

  update(dt) {
    this._walk += dt;
    // Idle bob
    if (this.moving) {
      this.root.position.y = Math.abs(Math.sin(this._walk * 8)) * 0.04;
    } else {
      this.root.position.y = Math.sin(this._walk * 2) * 0.01;
    }
    // Clear moving flag after brief moment if not actively called
    if (this.moving && this._autoCooldown <= 0) {
      // keep status until next action; moving visual settles
      this.moving = false;
    }
  }

  _idleStatus() {
    return `Holding target · guide ${this.guideIndex + 1}/${Math.max(1, this.guides.length)}`;
  }

  _orientTowardNear(tipPlan) {
    const t = this.getTargetPlan();
    const dx = tipPlan.x - t.x;
    const dy = tipPlan.y - t.y;
    // Face the striper (plan)
    this._faceYaw = Math.atan2(dx, dy); // will convert in place
  }

  _placeAtTarget() {
    const p = this.getTargetPlan();
    const w = planToWorld(p.x, p.y);
    const g = this.guide;
    // Root at target so reflective box (held forward) sits on the guide end
    this.root.position.set(w.x, 0, w.z);
    if (this.targetMesh) {
      // Box in hands — slight forward hold; laser math uses plan target at root XZ
      this.targetMesh.position.set(0, 0.95, 0.05);
    }
    if (g) {
      const faceT = this.targetT > 0.5 ? 0 : 1;
      const other = pointOnGuide(g, faceT);
      const fx = (other.x - p.x) * 0.05;
      const fz = (other.y - p.y) * 0.05;
      this.root.rotation.y = Math.atan2(fx, fz);
    }
  }
}
