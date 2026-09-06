import * as THREE from 'three';
import { planToWorld, SCALE } from './coords.js';
import { guideLength } from './missions.js';

/**
 * LineLazer-style ride-on/walk-behind striper — hopper, frame, gun arm, tip+guard,
 * casters/drive wheels, laser emitter. HOOKERS livery (no trademark logos).
 * Position stored in plan pixels for lock math; mesh placed in world meters.
 */
export class Striper {
  constructor() {
    this.x = 700;
    this.y = 1180;
    /** Heading in plan space (atan2 of plan Y over plan X) — same as 2D game */
    this.rot = -0.95;
    this.speed = 0;
    this.maxSpeed = 95; // plan px/s ≈ 4.75 m/s
    this.accel = 140;
    this.brake = 220;
    this.turnRate = 2.4;
    this.locked = false;
    this.lockGuide = null;
    this.lockT = 0;
    this.armLength = 28; // plan px ≈ 1.4 m

    this.root = new THREE.Group();
    this.root.name = 'striper';
    this._buildMesh();
  }

  _buildMesh() {
    const root = this.root;
    const steel = new THREE.MeshStandardMaterial({
      color: 0x2a3340,
      roughness: 0.45,
      metalness: 0.55,
    });
    const hookers = new THREE.MeshStandardMaterial({
      color: 0xff4d6d,
      roughness: 0.4,
      metalness: 0.25,
    });
    const chrome = new THREE.MeshStandardMaterial({
      color: 0xd0d7e2,
      roughness: 0.22,
      metalness: 0.9,
    });
    const hopperMat = new THREE.MeshStandardMaterial({
      color: 0xe8eef7,
      roughness: 0.35,
      metalness: 0.45,
    });
    const tire = new THREE.MeshStandardMaterial({
      color: 0x111418,
      roughness: 0.92,
      metalness: 0.05,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0xf5c518,
      roughness: 0.4,
      metalness: 0.3,
      emissive: 0xf5c518,
      emissiveIntensity: 0.15,
    });

    // Main frame / chassis
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 1.85), steel);
    frame.position.set(0, 0.42, 0);
    frame.castShadow = true;
    frame.receiveShadow = true;
    root.add(frame);

    // Side rails (HOOKERS pink)
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 1.7), hookers);
    railL.position.set(-0.52, 0.55, 0);
    railL.castShadow = true;
    root.add(railL);
    const railR = railL.clone();
    railR.position.x = 0.52;
    root.add(railR);

    // Paint hopper
    const hopper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.42, 0.72, 18),
      hopperMat
    );
    hopper.position.set(0, 0.95, -0.15);
    hopper.castShadow = true;
    root.add(hopper);
    const hopperLid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 18), steel);
    hopperLid.position.set(0, 1.32, -0.15);
    root.add(hopperLid);

    // HOOKERS badge plate on hopper
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.03), hookers);
    badge.position.set(0, 0.95, 0.28);
    root.add(badge);

    // Handlebar / tiller
    const tiller = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.05), chrome);
    tiller.position.set(0, 1.05, -0.85);
    root.add(tiller);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), chrome);
    stem.position.set(0, 0.78, -0.85);
    root.add(stem);

    // Engine / pump housing
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.5), steel);
    pump.position.set(0, 0.65, 0.55);
    pump.castShadow = true;
    root.add(pump);
    const pumpAccent = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), accent);
    pumpAccent.position.set(0, 0.82, 0.55);
    root.add(pumpAccent);

    // Drive wheels (rear)
    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 16);
    for (const [wx, wz] of [
      [-0.52, 0.55],
      [0.52, 0.55],
    ]) {
      const w = new THREE.Mesh(wheelGeo, tire);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.28, wz);
      w.castShadow = true;
      root.add(w);
    }
    // Front casters
    const casterGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 12);
    for (const [wx, wz] of [
      [-0.4, -0.7],
      [0.4, -0.7],
    ]) {
      const c = new THREE.Mesh(casterGeo, tire);
      c.rotation.z = Math.PI / 2;
      c.position.set(wx, 0.14, wz);
      c.castShadow = true;
      root.add(c);
    }

    // Gun arm (forward boom)
    this.arm = new THREE.Group();
    this.arm.name = 'gunArm';
    const armBeam = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.25), chrome);
    armBeam.position.set(0, 0, 0.55);
    this.arm.add(armBeam);
    const armDrop = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), chrome);
    armDrop.position.set(0, -0.2, 1.15);
    this.arm.add(armDrop);

    // Tip + tip guard
    const tipGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x1a1f28, roughness: 0.5, metalness: 0.4 })
    );
    tipGuard.position.set(0, -0.42, 1.15);
    this.arm.add(tipGuard);

    this.nozzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x3dff8a,
        emissive: 0x3dff8a,
        emissiveIntensity: 0.55,
        roughness: 0.3,
        metalness: 0.2,
      })
    );
    this.nozzle.position.set(0, -0.48, 1.15);
    this.nozzle.name = 'nozzle';
    this.arm.add(this.nozzle);

    // Laser emitter housing on arm
    const laserBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.08, 0.14),
      new THREE.MeshStandardMaterial({
        color: 0x111418,
        roughness: 0.4,
        metalness: 0.6,
        emissive: 0x0a3d20,
        emissiveIntensity: 0.3,
      })
    );
    laserBox.position.set(0, 0.08, 0.2);
    this.arm.add(laserBox);

    this.arm.position.set(0, 0.55, 0.35);
    root.add(this.arm);

    // Soft ground shadow disc
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);
  }

  reset(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.rot = spawn.rot;
    this.speed = 0;
    this.locked = false;
    this.lockGuide = null;
    this.syncMesh();
  }

  /** Tip in plan pixels */
  tip() {
    return {
      x: this.x + Math.cos(this.rot) * this.armLength,
      y: this.y + Math.sin(this.rot) * this.armLength,
    };
  }

  tipWorld() {
    const t = this.tip();
    const w = planToWorld(t.x, t.y);
    return { x: w.x, y: 0.04, z: w.z };
  }

  /**
   * @param {number} dt
   * @param {{forward:number, turn:number, precision:boolean}} input
   */
  update(dt, input) {
    if (this.locked && this.lockGuide) {
      this._updateLocked(dt, input);
    } else {
      const max = input.precision ? this.maxSpeed * 0.35 : this.maxSpeed;
      if (input.forward > 0) this.speed = Math.min(max, this.speed + this.accel * dt);
      else if (input.forward < 0) this.speed = Math.max(-max * 0.55, this.speed - this.accel * dt);
      else if (this.speed > 0) this.speed = Math.max(0, this.speed - this.brake * 0.45 * dt);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.brake * 0.45 * dt);

      const steerScale = 0.55 + Math.min(1, Math.abs(this.speed) / 40) * 0.45;
      this.rot += input.turn * this.turnRate * steerScale * dt;

      this.x += Math.cos(this.rot) * this.speed * dt;
      this.y += Math.sin(this.rot) * this.speed * dt;
    }
    this.syncMesh();
  }

  _updateLocked(dt, input) {
    const guide = this.lockGuide;
    const dx = guide.b.x - guide.a.x;
    const dy = guide.b.y - guide.a.y;
    const len = Math.hypot(dx, dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;

    let ang = Math.atan2(dirY, dirX);
    if (Math.abs(normalizeAngle(ang - this.rot)) > Math.PI / 2) ang += Math.PI;
    this.rot = ang;

    const max = input.precision ? this.maxSpeed * 0.4 : this.maxSpeed * 0.9;
    if (input.forward > 0) this.speed = Math.min(max, this.speed + this.accel * dt);
    else if (input.forward < 0) this.speed = Math.max(-max * 0.55, this.speed - this.accel * dt);
    else if (this.speed > 0) this.speed = Math.max(0, this.speed - this.brake * 0.5 * dt);
    else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.brake * 0.5 * dt);

    const tip = this.tip();
    let t = ((tip.x - guide.a.x) * dx + (tip.y - guide.a.y) * dy) / (len * len);
    t += (this.speed * dt) / len;
    t = Math.max(-0.02, Math.min(1.02, t));
    this.lockT = t;

    const tipX = guide.a.x + dx * t;
    const tipY = guide.a.y + dy * t;
    this.x = tipX - Math.cos(this.rot) * this.armLength;
    this.y = tipY - Math.sin(this.rot) * this.armLength;

    if (Math.abs(input.turn) > 0.9) this.unlock();
  }

  lock(guide) {
    this.locked = true;
    this.lockGuide = guide;
    const tip = this.tip();
    const dx = guide.b.x - guide.a.x;
    const dy = guide.b.y - guide.a.y;
    const len2 = dx * dx + dy * dy || 1;
    this.lockT = ((tip.x - guide.a.x) * dx + (tip.y - guide.a.y) * dy) / len2;

    let ang = Math.atan2(dy, dx);
    if (Math.abs(normalizeAngle(ang - this.rot)) > Math.PI / 2) ang += Math.PI;
    this.rot = ang;

    const t = Math.max(0, Math.min(1, this.lockT));
    const tipX = guide.a.x + dx * t;
    const tipY = guide.a.y + dy * t;
    this.x = tipX - Math.cos(this.rot) * this.armLength;
    this.y = tipY - Math.sin(this.rot) * this.armLength;
    this.lockT = t;
    this.syncMesh();
  }

  unlock() {
    this.locked = false;
    this.lockGuide = null;
  }

  syncMesh() {
    const w = planToWorld(this.x, this.y);
    this.root.position.set(w.x, 0, w.z);
    // Plan rot: 0 = +X in plan = +X world; plan +Y = +Z world
    // Mesh forward is +Z, so yaw = -rot + PI/2? 
    // tip is at cos(rot),sin(rot) in plan = (worldX, worldZ)
    // We want nozzle along +local Z of arm; root faces that direction.
    // Three.js Yaw: rotation.y = 0 faces +Z. Direction (dx,dz)=(cos(rot),sin(rot))
    // atan2(dx, dz) = atan2(cos, sin) ... yaw = Math.atan2(dx, dz)
    this.root.rotation.y = Math.atan2(Math.cos(this.rot), Math.sin(this.rot));
  }
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
