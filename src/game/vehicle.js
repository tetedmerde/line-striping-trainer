import * as THREE from 'three';
import { COLOR_HEX } from './missions.js';

/**
 * Driveable HOOKERS crew striping truck with side boom.
 * Easy hire-friendly handling: turn-in-place, precision crawl (Shift), strong reverse.
 */
export function createVehicle() {
  const root = new THREE.Group();
  root.name = 'vehicle';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.45,
    metalness: 0.25,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.5,
    metalness: 0.35,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.25,
    metalness: 0.85,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.15,
    metalness: 0.4,
    transparent: true,
    opacity: 0.55,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.4,
    metalness: 0.2,
    emissive: 0x9a3412,
    emissiveIntensity: 0.25,
  });

  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 4.2), bodyMat);
  bed.position.set(0, 0.85, 0);
  bed.castShadow = true;
  bed.receiveShadow = true;
  root.add(bed);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.15, 1.5), bodyMat);
  cab.position.set(0, 1.55, -1.55);
  cab.castShadow = true;
  root.add(cab);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 0.12), glassMat);
  glass.position.set(0, 1.7, -2.28);
  root.add(glass);

  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 1.6, 16),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.4 })
  );
  tank.rotation.z = Math.PI / 2;
  tank.position.set(0, 1.45, 0.55);
  tank.castShadow = true;
  root.add(tank);

  // Door / side HOOKERS stripe
  const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 1.8), accentMat);
  sideStripe.position.set(1.12, 1.05, -0.2);
  root.add(sideStripe);
  const sideStripeL = sideStripe.clone();
  sideStripeL.position.x = -1.12;
  root.add(sideStripeL);

  // Cab roof HOOKERS letter blocks (generic block letters)
  addHookersDecal(root, 0, 2.25, -1.55, 0.22);
  // Bed side panel letters
  addHookersDecal(root, 1.14, 1.15, 0.6, 0.16, Math.PI / 2);
  addHookersDecal(root, -1.14, 1.15, 0.6, 0.16, -Math.PI / 2);

  const boom = new THREE.Group();
  boom.name = 'boom';
  const boomArm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.1), chromeMat);
  boomArm.position.set(1.9, 0, 0);
  boom.add(boomArm);
  const boomDrop = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), chromeMat);
  boomDrop.position.set(3.05, -0.3, 0);
  boom.add(boomDrop);

  // Boom HOOKERS wrap
  const boomTag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.12), accentMat);
  boomTag.position.set(1.6, 0.08, 0);
  boom.add(boomTag);

  const nozzle = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.4,
    })
  );
  nozzle.position.set(3.05, -0.65, 0);
  nozzle.name = 'nozzle';
  boom.add(nozzle);

  boom.position.set(0.2, 1.0, 0.8);
  root.add(boom);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 14);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const wheelPositions = [
    [-0.95, 0.42, -1.4],
    [0.95, 0.42, -1.4],
    [-0.95, 0.42, 1.35],
    [0.95, 0.42, 1.35],
  ];
  const wheels = [];
  for (const [wx, wy, wz] of wheelPositions) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    w.castShadow = true;
    root.add(w);
    wheels.push(w);
  }

  const lightBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.15, 0.25),
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.6,
    })
  );
  lightBar.position.set(0, 2.2, -1.55);
  root.add(lightBar);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.25, 0.3), darkMat);
  bumper.position.set(0, 0.55, -2.25);
  root.add(bumper);

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
  };

  function setPose(x, z, yaw) {
    state.x = x;
    state.z = z;
    state.yaw = yaw;
    state.speed = 0;
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

    const throttle = input.forward;
    if (throttle > 0.05) {
      state.speed += accel * throttle * dt;
    } else if (throttle < -0.05) {
      // Strong reverse — treat as reverse accel when stopped/backing
      if (state.speed > 0.15) {
        state.speed -= state.brake * Math.abs(throttle) * dt;
      } else {
        state.speed -= revAccel * Math.abs(throttle) * dt;
      }
    } else {
      if (state.speed > 0) state.speed = Math.max(0, state.speed - state.coast * dt);
      else if (state.speed < 0) state.speed = Math.min(0, state.speed + state.coast * dt);
    }

    // Auto-creep when holding A/D at near-zero so tank-steer works
    let steer = input.steer;
    if (Math.abs(steer) > 0.05 && Math.abs(state.speed) < 0.35 && Math.abs(throttle) < 0.05) {
      state.speed = (state.speed >= 0 ? 1 : -1) * (crawl ? 0.55 : 1.15);
    }

    state.speed = THREE.MathUtils.clamp(state.speed, -maxSpd * 0.75, maxSpd);

    // Meaningful steering at low/zero speed (no harsh speedFactor floor)
    const absSpd = Math.abs(state.speed);
    const speedFactor = crawl
      ? THREE.MathUtils.clamp(0.85 + absSpd / maxSpd, 0.85, 1.2)
      : THREE.MathUtils.clamp(0.55 + absSpd / maxSpd, 0.55, 1.15);
    const turn = crawl ? state.crawlTurn : state.turnRate;
    const dir = Math.sign(state.speed || 1);
    state.yaw -= steer * turn * speedFactor * dir * dt;

    state.x += Math.sin(state.yaw) * state.speed * dt;
    state.z += Math.cos(state.yaw) * state.speed * dt;

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

  setColor('white');

  return {
    root,
    boom,
    nozzle,
    state,
    setPose,
    setColor,
    update,
    getNozzleWorld,
  };
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
