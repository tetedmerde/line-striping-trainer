import * as THREE from 'three';

/**
 * HOOKERS paint-crew NPCs — hard hats, vests, spray wands, simple wander.
 * Entertainment ambience only (crew mates, not customers / not NSFW).
 */
export function createCrew(scene) {
  const group = new THREE.Group();
  group.name = 'hookersCrew';

  const spots = [
    { x: -30, z: 8, yaw: 0.4 },
    { x: -8, z: -10, yaw: -0.6 },
    { x: 18, z: 6, yaw: 1.2 },
    { x: 36, z: 20, yaw: -2.1 },
    { x: -42, z: 28, yaw: 0.2 },
    { x: 8, z: 34, yaw: 2.8 },
    { x: -20, z: 40, yaw: -1.4 },
    { x: 44, z: -8, yaw: 0.9 },
  ];

  const members = spots.map((s, i) => createCrewMember(s.x, s.z, s.yaw, i));
  for (const m of members) group.add(m.root);
  scene.add(group);

  function update(dt, player) {
    for (const m of members) {
      m.update(dt, player);
    }
  }

  return { group, members, update };
}

function createCrewMember(x, z, yaw, seed) {
  const root = new THREE.Group();
  root.name = `crew_${seed}`;

  const skin = new THREE.MeshStandardMaterial({ color: 0xe8c4a8, roughness: 0.85 });
  const vestCol = seed % 2 === 0 ? 0xf59e0b : 0xf97316;
  const vest = new THREE.MeshStandardMaterial({
    color: vestCol,
    roughness: 0.55,
    emissive: vestCol,
    emissiveIntensity: 0.12,
  });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const hatMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.45,
    metalness: 0.1,
  });
  const wandMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.7,
    roughness: 0.3,
  });

  // Legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), pants);
  legL.position.set(-0.14, 0.35, 0);
  legL.castShadow = true;
  root.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), pants);
  legR.position.set(0.14, 0.35, 0);
  legR.castShadow = true;
  root.add(legR);

  // Torso + safety vest
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.32), vest);
  torso.position.set(0, 0.95, 0);
  torso.castShadow = true;
  root.add(torso);

  // Vest reflective stripe
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.08, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.15 })
  );
  stripe.position.set(0, 1.05, 0);
  root.add(stripe);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), skin);
  head.position.set(0, 1.45, 0);
  head.castShadow = true;
  root.add(head);

  // Hard hat
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 10), hatMat);
  hat.position.set(0, 1.68, 0);
  hat.castShadow = true;
  root.add(hat);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.18), hatMat);
  brim.position.set(0, 1.62, 0.14);
  root.add(brim);

  // Arms
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), vest);
  armL.position.set(-0.38, 0.95, 0);
  armL.castShadow = true;
  root.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), vest);
  armR.position.set(0.38, 0.95, 0);
  armR.castShadow = true;
  root.add(armR);

  // Spray wand in right hand
  const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), wandMat);
  wand.rotation.z = Math.PI / 2.4;
  wand.position.set(0.55, 0.75, 0.15);
  root.add(wand);
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.35 })
  );
  tip.position.set(0.95, 0.55, 0.2);
  root.add(tip);

  // Chest HOOKERS tag (tiny block)
  const tag = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.1, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 })
  );
  tag.position.set(0, 1.15, 0.18);
  root.add(tag);

  const home = { x, z };
  const state = {
    x,
    z,
    yaw,
    phase: seed * 1.7,
    mode: seed % 3 === 0 ? 'idle' : 'wander',
    walkTimer: 2 + (seed % 5),
    targetYaw: yaw,
  };

  function sync() {
    root.position.set(state.x, 0, state.z);
    root.rotation.y = state.yaw;
    // Idle bob / walk cycle
    const t = state.phase;
    const walk = state.mode === 'wander' ? 1 : 0.25;
    legL.rotation.x = Math.sin(t * 6) * 0.35 * walk;
    legR.rotation.x = Math.sin(t * 6 + Math.PI) * 0.35 * walk;
    armL.rotation.x = Math.sin(t * 6 + Math.PI) * 0.25 * walk;
    armR.rotation.x = Math.sin(t * 6) * 0.25 * walk;
    root.position.y = Math.abs(Math.sin(t * 6)) * 0.03 * walk;
  }

  function update(dt, player) {
    state.phase += dt;
    state.walkTimer -= dt;

    // Soft avoid player truck
    if (player) {
      const dx = state.x - player.state.x;
      const dz = state.z - player.state.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 4.5 && dist > 0.01) {
        state.x += (dx / dist) * 1.8 * dt;
        state.z += (dz / dist) * 1.8 * dt;
        state.yaw = Math.atan2(dx, dz);
      }
    }

    if (state.mode === 'wander') {
      const speed = 1.1;
      state.x += Math.sin(state.yaw) * speed * dt;
      state.z += Math.cos(state.yaw) * speed * dt;

      // Stay near home
      const hx = state.x - home.x;
      const hz = state.z - home.z;
      if (hx * hx + hz * hz > 14 * 14) {
        state.targetYaw = Math.atan2(-hx, -hz);
      }

      if (state.walkTimer <= 0) {
        state.walkTimer = 3 + Math.random() * 5;
        if (Math.random() < 0.35) {
          state.mode = 'idle';
          state.walkTimer = 2 + Math.random() * 3;
        } else {
          state.targetYaw += (Math.random() - 0.5) * 1.8;
        }
      }
      state.yaw = THREE.MathUtils.lerp(state.yaw, state.targetYaw, 1 - Math.exp(-2.5 * dt));
    } else {
      // Idle — slight look-around
      state.yaw += Math.sin(state.phase * 0.7) * 0.15 * dt;
      if (state.walkTimer <= 0) {
        state.mode = 'wander';
        state.walkTimer = 4 + Math.random() * 6;
        state.targetYaw = state.yaw + (Math.random() - 0.5) * 2;
      }
    }

    // Soft lot bounds (front field)
    state.x = THREE.MathUtils.clamp(state.x, -58, 58);
    state.z = THREE.MathUtils.clamp(state.z, -40, 48);

    sync();
  }

  sync();
  return { root, state, update };
}
