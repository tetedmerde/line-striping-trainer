import * as THREE from 'three';
import { COLOR_HEX } from './missions.js';

/**
 * HOOKERS LineLazer-style ride-on airless striper (generic silhouette —
 * hopper, gun arm, tip+guard, laser emitter, rear drive + front casters).
 * No Graco trademarks as logos.
 */
export function createVehicle() {
  const root = new THREE.Group();
  root.name = 'vehicle';

  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.42,
    metalness: 0.28,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.48,
    metalness: 0.45,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.22,
    metalness: 0.88,
  });
  const hopperMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.35,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.4,
    metalness: 0.2,
    emissive: 0x9a3412,
    emissiveIntensity: 0.28,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.85,
    metalness: 0.1,
  });
  const labelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.55,
    metalness: 0.2,
  });

  // —— Chassis / frame (ride-on LineDriver-ish silhouette) ——
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.18, 2.55), frameMat);
  deck.position.set(0, 0.55, 0.05);
  deck.castShadow = true;
  deck.receiveShadow = true;
  root.add(deck);

  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 2.2), frameMat);
  keel.position.set(0, 0.38, 0.1);
  root.add(keel);

  // Rear drive housing
  const driveBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 0.7), yellowMat);
  driveBox.position.set(0, 0.72, -0.95);
  driveBox.castShadow = true;
  root.add(driveBox);

  // Front nacelle / pump housing
  const pump = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.85), yellowMat);
  pump.position.set(0, 0.88, 0.85);
  pump.castShadow = true;
  root.add(pump);

  // Generic “airless striper” plate (not a trademark logo)
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.04), labelMat);
  plate.position.set(0, 0.95, 1.28);
  root.add(plate);

  // Paint hopper(s)
  const hopper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.42, 0.7, 18),
    hopperMat
  );
  hopper.position.set(0, 1.35, 0.55);
  hopper.castShadow = true;
  root.add(hopper);
  const hopperLid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 18), chromeMat);
  hopperLid.position.set(0, 1.72, 0.55);
  root.add(hopperLid);
  const hopper2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.24, 0.45, 14),
    hopperMat
  );
  hopper2.position.set(-0.48, 1.15, 0.15);
  hopper2.castShadow = true;
  root.add(hopper2);

  // Operator seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.5), seatMat);
  seat.position.set(0, 1.05, -0.55);
  root.add(seat);
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.1), seatMat);
  seatBack.position.set(0, 1.28, -0.78);
  root.add(seatBack);

  // Steering column / handlebar
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.7, 8), chromeMat);
  column.position.set(0, 1.25, 0.15);
  column.rotation.x = 0.35;
  root.add(column);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), chromeMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.55, 0.02);
  root.add(bar);

  // HOOKERS crew branding
  addHookersDecal(root, 0, 1.05, -0.95, 0.14);
  addHookersDecal(root, 0.7, 0.85, 0.2, 0.12, Math.PI / 2);
  addHookersDecal(root, -0.7, 0.85, 0.2, 0.12, -Math.PI / 2);

  const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 1.4), accentMat);
  sideStripe.position.set(0.68, 0.72, 0.1);
  root.add(sideStripe);
  const sideStripeL = sideStripe.clone();
  sideStripeL.position.x = -0.68;
  root.add(sideStripeL);

  // Warning beacon
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.18, 10),
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.7,
    })
  );
  beacon.position.set(0.35, 1.55, -0.95);
  root.add(beacon);

  // —— Gun arm / spray gun (offset right, LineLazer-style) ——
  const boom = new THREE.Group();
  boom.name = 'boom';

  const armPivot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.2), chromeMat);
  armPivot.position.set(0, 0, 0);
  boom.add(armPivot);

  const boomArm = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 0.08), chromeMat);
  boomArm.position.set(0.95, 0, 0);
  boom.add(boomArm);

  const boomBrace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), chromeMat);
  boomBrace.position.set(1.75, 0, 0.2);
  boom.add(boomBrace);

  const dropTube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8), chromeMat);
  dropTube.position.set(1.75, -0.28, 0.35);
  boom.add(dropTube);

  // Tip guard (fan-tip housing)
  const tipGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.08, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.5, metalness: 0.5 })
  );
  tipGuard.position.set(1.75, -0.58, 0.35);
  boom.add(tipGuard);

  const nozzle = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.55,
    })
  );
  nozzle.position.set(1.75, -0.62, 0.35);
  nozzle.name = 'nozzle';
  boom.add(nozzle);

  // Laser emitter under / near tip (LazerGuide-style start/stop + aim)
  const laserEmitter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.1, 8),
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 0.9,
      roughness: 0.3,
      metalness: 0.5,
    })
  );
  laserEmitter.rotation.x = Math.PI / 2;
  laserEmitter.position.set(1.75, -0.52, 0.48);
  laserEmitter.name = 'laserEmitter';
  boom.add(laserEmitter);

  const boomTag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.1), accentMat);
  boomTag.position.set(0.7, 0.07, 0);
  boom.add(boomTag);

  boom.position.set(0.55, 0.85, 0.55);
  root.add(boom);

  // —— Wheels: rear drive + front casters ——
  const rearGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.22, 16);
  const casterGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.92 });
  const wheels = [];

  for (const [wx, wy, wz] of [
    [-0.7, 0.38, -0.95],
    [0.7, 0.38, -0.95],
  ]) {
    const w = new THREE.Mesh(rearGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    w.castShadow = true;
    root.add(w);
    wheels.push(w);
  }
  for (const [wx, wy, wz] of [
    [-0.45, 0.2, 1.15],
    [0.45, 0.2, 1.15],
  ]) {
    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.06), chromeMat);
    fork.position.set(wx, wy + 0.12, wz);
    root.add(fork);
    const w = new THREE.Mesh(casterGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    w.castShadow = true;
    root.add(w);
    wheels.push(w);
  }

  const state = {
    x: 0,
    z: 0,
    yaw: 0,
    speed: 0,
    steer: 0,
    spraying: false,
    color: 'white',
    maxSpeed: 7.5,
    accel: 11,
    brake: 16,
    reverseAccel: 14,
    coast: 8,
    turnRate: 2.35,
    crawlTurn: 2.8,
    precision: false,
    locked: false,
    lockYaw: 0,
    lockOx: 0,
    lockOz: 0,
    lockDx: 0,
    lockDz: 1,
  };

  function setPose(x, z, yaw) {
    state.x = x;
    state.z = z;
    state.yaw = yaw;
    state.speed = 0;
    state.locked = false;
    syncTransform();
  }

  function setColor(name) {
    state.color = name;
    const hex = COLOR_HEX[name] ?? 0xffffff;
    nozzle.material.color.setHex(hex);
    nozzle.material.emissive.setHex(hex);
  }

  function syncTransform() {
    root.position.set(state.x, 0, state.z);
    root.rotation.y = state.yaw;
  }

  function lockPath(ox, oz, dx, dz, yaw) {
    const len = Math.hypot(dx, dz) || 1;
    state.locked = true;
    state.lockOx = ox;
    state.lockOz = oz;
    state.lockDx = dx / len;
    state.lockDz = dz / len;
    state.lockYaw = yaw;
  }

  function unlockPath() {
    state.locked = false;
  }

  /**
   * @param {number} dt
   * @param {{ forward: number, steer: number, spray: boolean, precision?: boolean }} input
   * @param {{ halfW: number, halfD: number }} bounds
   */
  function update(dt, input, bounds) {
    state.precision = !!input.precision;
    const crawl = state.precision;
    const maxSpd = crawl ? state.maxSpeed * 0.28 : state.maxSpeed;
    const accel = crawl ? state.accel * 0.55 : state.accel;
    const revAccel = crawl ? state.reverseAccel * 0.7 : state.reverseAccel;

    let steer = input.steer;

    // Hard steer breaks lock
    if (state.locked && Math.abs(steer) > 0.85) {
      unlockPath();
    }

    const throttle = input.forward;
    if (throttle > 0.05) {
      state.speed += accel * throttle * dt;
    } else if (throttle < -0.05) {
      if (state.speed > 0.15) {
        state.speed -= state.brake * Math.abs(throttle) * dt;
      } else {
        state.speed -= revAccel * Math.abs(throttle) * dt;
      }
    } else {
      if (state.speed > 0) state.speed = Math.max(0, state.speed - state.coast * dt);
      else if (state.speed < 0) state.speed = Math.min(0, state.speed + state.coast * dt);
    }

    if (Math.abs(steer) > 0.05 && Math.abs(state.speed) < 0.35 && Math.abs(throttle) < 0.05) {
      state.speed = (state.speed >= 0 ? 1 : -1) * (crawl ? 0.55 : 1.15);
    }

    state.speed = THREE.MathUtils.clamp(state.speed, -maxSpd * 0.75, maxSpd);

    const absSpd = Math.abs(state.speed);
    const speedFactor = crawl
      ? THREE.MathUtils.clamp(0.85 + absSpd / maxSpd, 0.85, 1.2)
      : THREE.MathUtils.clamp(0.55 + absSpd / maxSpd, 0.55, 1.15);
    const turn = crawl ? state.crawlTurn : state.turnRate;
    const dir = Math.sign(state.speed || 1);

    if (state.locked) {
      // Assist: hold heading; keep NOZZLE on the lock path (gun is side-offset)
      const yawErr = shortestAngle(state.yaw, state.lockYaw);
      state.yaw += THREE.MathUtils.clamp(yawErr, -2.4 * dt, 2.4 * dt);
      state.yaw -= steer * turn * 0.12 * speedFactor * dir * dt;

      // Drive along lock axis first
      state.x += state.lockDx * state.speed * dt;
      state.z += state.lockDz * state.speed * dt;

      // Nozzle local offset (boom + tip) — keep tip on paint line
      const nlx = 2.3;
      const nlz = 0.9;
      const cos = Math.cos(state.yaw);
      const sin = Math.sin(state.yaw);
      const nox = state.x + cos * nlx + sin * nlz;
      const noz = state.z - sin * nlx + cos * nlz;

      const toX = nox - state.lockOx;
      const toZ = noz - state.lockOz;
      const along = toX * state.lockDx + toZ * state.lockDz;
      const px = state.lockOx + state.lockDx * along;
      const pz = state.lockOz + state.lockDz * along;
      const latX = nox - px;
      const latZ = noz - pz;
      const snap = 1 - Math.exp(-10 * dt);
      state.x -= latX * snap;
      state.z -= latZ * snap;
    } else {
      state.yaw -= steer * turn * speedFactor * dir * dt;
      state.x += Math.sin(state.yaw) * state.speed * dt;
      state.z += Math.cos(state.yaw) * state.speed * dt;
    }

    const margin = 2.5;
    state.x = THREE.MathUtils.clamp(state.x, -bounds.halfW + margin, bounds.halfW - margin);
    state.z = THREE.MathUtils.clamp(state.z, -bounds.halfD + margin, bounds.halfD - margin);

    state.spraying = !!input.spray;
    syncTransform();

    const spin = state.speed * dt * 2.2;
    for (const w of wheels) w.rotation.x += spin;
  }

  function getNozzleWorld(target = new THREE.Vector3()) {
    nozzle.getWorldPosition(target);
    return target;
  }

  function getLaserEmitterWorld(target = new THREE.Vector3()) {
    laserEmitter.getWorldPosition(target);
    return target;
  }

  /** Forward aim direction in XZ (unit). */
  function getAimDir(out = new THREE.Vector2()) {
    if (state.locked) {
      out.set(state.lockDx, state.lockDz);
    } else {
      out.set(Math.sin(state.yaw), Math.cos(state.yaw));
    }
    return out;
  }

  setColor('white');

  return {
    root,
    boom,
    nozzle,
    laserEmitter,
    state,
    setPose,
    setColor,
    update,
    getNozzleWorld,
    getLaserEmitterWorld,
    getAimDir,
    lockPath,
    unlockPath,
  };
}

function shortestAngle(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function addHookersDecal(parent, x, y, z, scale = 0.2, yaw = 0) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.45,
    metalness: 0.15,
  });
  const letters = 'HOOKERS';
  const w = scale * 0.85;
  const gap = scale * 0.22;
  let lx = -((letters.length * w + (letters.length - 1) * gap) / 2);
  for (const ch of letters) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w * (ch === 'I' ? 0.4 : 1), scale * 1.1, scale * 0.25),
      mat
    );
    m.position.set(lx + w / 2, 0, 0);
    g.add(m);
    lx += w + gap;
  }
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  parent.add(g);
  return g;
}

/**
 * Chase camera — higher/farther for striping readability.
 * camMode: 'chase' | 'ortho'
 */
export function updateChaseCamera(camera, vehicle, dt, opts = {}) {
  const s = vehicle.state;
  const mode = opts.mode || 'chase';

  if (mode === 'ortho') {
    const desired = new THREE.Vector3(s.x, 42, s.z + 0.01);
    camera.position.lerp(desired, 1 - Math.exp(-6 * dt));
    camera.up.set(0, 1, 0);
    camera.lookAt(s.x, 0, s.z);
    if (camera.isOrthographicCamera) {
      const half = 22;
      const aspect = opts.aspect || 1.6;
      camera.left = -half * aspect;
      camera.right = half * aspect;
      camera.top = half;
      camera.bottom = -half;
      camera.updateProjectionMatrix();
    }
    return;
  }

  const back = 11.5;
  const height = 7.2;
  const desired = new THREE.Vector3(
    s.x - Math.sin(s.yaw) * back,
    height,
    s.z - Math.cos(s.yaw) * back
  );
  camera.position.lerp(desired, 1 - Math.exp(-3.8 * dt));
  const lookAt = new THREE.Vector3(
    s.x + Math.sin(s.yaw) * 3.5,
    1.0,
    s.z + Math.cos(s.yaw) * 3.5
  );
  camera.lookAt(lookAt);
}
