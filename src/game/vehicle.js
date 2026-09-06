import * as THREE from 'three';
import { COLOR_HEX } from './missions.js';

/**
 * Driveable line-striping truck with side boom / spray wand.
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

  // Chassis / bed
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 4.2), bodyMat);
  bed.position.set(0, 0.85, 0);
  bed.castShadow = true;
  bed.receiveShadow = true;
  root.add(bed);

  // Cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.15, 1.5), bodyMat);
  cab.position.set(0, 1.55, -1.55);
  cab.castShadow = true;
  root.add(cab);

  // Windshield
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 0.12), glassMat);
  glass.position.set(0, 1.7, -2.28);
  root.add(glass);

  // Paint tank on bed
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 1.6, 16),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.4 })
  );
  tank.rotation.z = Math.PI / 2;
  tank.position.set(0, 1.45, 0.55);
  tank.castShadow = true;
  root.add(tank);

  // Boom arm (right side)
  const boom = new THREE.Group();
  boom.name = 'boom';
  const boomArm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.1), chromeMat);
  boomArm.position.set(1.9, 0, 0);
  boom.add(boomArm);
  const boomDrop = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), chromeMat);
  boomDrop.position.set(3.05, -0.3, 0);
  boom.add(boomDrop);

  // Wand / nozzle tip — spray origin
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

  // Wheels
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

  // Light bar
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

  // Bumper
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.25, 0.3), darkMat);
  bumper.position.set(0, 0.55, -2.25);
  root.add(bumper);

  // State
  const state = {
    x: 0,
    z: 0,
    yaw: 0,
    speed: 0,
    steer: 0,
    spraying: false,
    color: 'white',
    maxSpeed: 9.5,
    accel: 14,
    brake: 18,
    coast: 6,
    turnRate: 1.85,
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
   * @param {{ forward: number, steer: number, spray: boolean }} input
   * @param {{ halfW: number, halfD: number }} bounds
   */
  function update(dt, input, bounds) {
    // Steer & throttle
    const throttle = input.forward;
    if (throttle > 0.05) {
      state.speed += state.accel * throttle * dt;
    } else if (throttle < -0.05) {
      state.speed -= state.brake * Math.abs(throttle) * dt;
    } else {
      // coast / friction
      if (state.speed > 0) state.speed = Math.max(0, state.speed - state.coast * dt);
      else if (state.speed < 0) state.speed = Math.min(0, state.speed + state.coast * dt);
    }
    state.speed = THREE.MathUtils.clamp(state.speed, -state.maxSpeed * 0.45, state.maxSpeed);

    const speedFactor = THREE.MathUtils.clamp(Math.abs(state.speed) / state.maxSpeed, 0.15, 1);
    state.yaw -= input.steer * state.turnRate * speedFactor * Math.sign(state.speed || 1) * dt;

    state.x += Math.sin(state.yaw) * state.speed * dt;
    state.z += Math.cos(state.yaw) * state.speed * dt;

    // Soft lot bounds
    const margin = 2;
    state.x = THREE.MathUtils.clamp(state.x, -bounds.halfW + margin, bounds.halfW - margin);
    state.z = THREE.MathUtils.clamp(state.z, -bounds.halfD + margin, bounds.halfD - margin);

    state.spraying = !!input.spray;
    syncTransform();

    // Wheel spin visual
    const spin = state.speed * dt * 2.2;
    for (const w of wheels) w.rotation.x += spin;
  }

  /** World position of spray nozzle */
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

/**
 * Chase camera slightly above and behind the truck.
 */
export function updateChaseCamera(camera, vehicle, dt, lookOffset = new THREE.Vector3()) {
  const s = vehicle.state;
  const back = 8.5;
  const height = 5.2;
  const desired = new THREE.Vector3(
    s.x - Math.sin(s.yaw) * back,
    height,
    s.z - Math.cos(s.yaw) * back
  );
  camera.position.lerp(desired, 1 - Math.exp(-4.5 * dt));
  const lookAt = new THREE.Vector3(
    s.x + Math.sin(s.yaw) * 4 + lookOffset.x,
    1.2,
    s.z + Math.cos(s.yaw) * 4 + lookOffset.z
  );
  camera.lookAt(lookAt);
}
