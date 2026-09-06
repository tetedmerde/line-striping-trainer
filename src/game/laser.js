import * as THREE from 'three';

/**
 * LazerGuide-style target box + green laser beam + lock-on assist.
 * Workflow: place/cycle target → line up laser on target → L to lock → stripe.
 */

const TARGET_HALF_W = 0.55;
const TARGET_HALF_H = 0.45;
const ON_TARGET_ANGLE = 0.065; // ~3.7°
const ON_TARGET_LATERAL = 0.55;

/**
 * Build guide segments from mission rects/polys for target placement.
 * Each segment: { ax, az, bx, bz, mx, mz, color, type }
 * Target goes at far end (b).
 */
export function buildGuideSegments(mission) {
  const segs = [];

  for (const r of mission.rects || []) {
    if (r.rot) {
      const cos = Math.cos(r.rot);
      const sin = Math.sin(r.rot);
      // Local length along d (depth), width along w
      const halfD = r.d / 2;
      const ax = r.x - halfD * sin;
      const az = r.z - halfD * cos;
      const bx = r.x + halfD * sin;
      const bz = r.z + halfD * cos;
      segs.push({
        ax,
        az,
        bx,
        bz,
        mx: r.x,
        mz: r.z,
        color: r.color,
        type: r.type || 'line',
      });
    } else {
      // Axis-aligned: prefer longer axis as stripe direction
      if (r.d >= r.w) {
        const ax = r.x + r.w / 2;
        const az = r.z;
        const bx = r.x + r.w / 2;
        const bz = r.z + r.d;
        segs.push({
          ax,
          az,
          bx,
          bz,
          mx: ax,
          mz: (az + bz) / 2,
          color: r.color,
          type: r.type || 'line',
        });
      } else {
        const ax = r.x;
        const az = r.z + r.d / 2;
        const bx = r.x + r.w;
        const bz = r.z + r.d / 2;
        segs.push({
          ax,
          az,
          bx,
          bz,
          mx: (ax + bx) / 2,
          mz: az,
          color: r.color,
          type: r.type || 'line',
        });
      }
    }
  }

  for (const p of mission.polys || []) {
    if (!p.points || p.points.length < 2) continue;
    // Use first→last as primary stripe for arrows/paths
    const a = p.points[0];
    const b = p.points[p.points.length - 1];
    segs.push({
      ax: a.x,
      az: a.z,
      bx: b.x,
      bz: b.z,
      mx: (a.x + b.x) / 2,
      mz: (a.z + b.z) / 2,
      color: p.color,
      type: p.type || 'poly',
    });
  }

  return segs;
}

export function createLaserSystem(scene, mission) {
  const group = new THREE.Group();
  group.name = 'laserSystem';
  scene.add(group);

  const segments = buildGuideSegments(mission);
  let targetIndex = 0;
  let laserOn = true;
  let onTarget = false;

  // Reflective target box (LazerGuide Target Box style — bright face)
  const targetRoot = new THREE.Group();
  targetRoot.name = 'targetBox';

  const boxMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
    metalness: 0.55,
    emissive: 0x86efac,
    emissiveIntensity: 0.35,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    roughness: 0.5,
    metalness: 0.3,
  });
  const face = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.12), boxMat);
  face.position.y = 0.55;
  targetRoot.add(face);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.06), frameMat);
  rim.position.y = 0.55;
  rim.position.z = -0.02;
  targetRoot.add(rim);
  // Crosshair / reflective center
  const crossH = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.06, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.8,
    })
  );
  crossH.position.set(0, 0.55, 0.08);
  targetRoot.add(crossH);
  const crossV = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.7, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.8,
    })
  );
  crossV.position.set(0, 0.55, 0.08);
  targetRoot.add(crossV);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.55, 8),
    new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.6, metalness: 0.4 })
  );
  pole.position.y = 0.2;
  targetRoot.add(pole);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.32, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 })
  );
  base.position.y = 0.04;
  targetRoot.add(base);

  group.add(targetRoot);

  // Laser beam line
  const beamGeom = new THREE.BufferGeometry();
  const beamPositions = new Float32Array(6);
  beamGeom.setAttribute('position', new THREE.BufferAttribute(beamPositions, 3));
  const beamMat = new THREE.LineBasicMaterial({
    color: 0x4ade80,
    transparent: true,
    opacity: 0.85,
    depthTest: true,
  });
  const beam = new THREE.Line(beamGeom, beamMat);
  beam.visible = false;
  beam.frustumCulled = false;
  group.add(beam);

  // Ground reference dot (optional “night” aid — always subtle)
  const groundDot = new THREE.Mesh(
    new THREE.CircleGeometry(0.08, 12),
    new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  groundDot.rotation.x = -Math.PI / 2;
  groundDot.position.y = 0.03;
  groundDot.visible = false;
  group.add(groundDot);

  // Hit spark on target face when on-target
  const hitSpark = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 10),
    new THREE.MeshBasicMaterial({
      color: 0xbbf7d0,
      transparent: true,
      opacity: 0.95,
    })
  );
  hitSpark.visible = false;
  group.add(hitSpark);

  const emitterWorld = new THREE.Vector3();
  const aim2 = new THREE.Vector2();
  const nozzleWorld = new THREE.Vector3();

  function placeTargetAtSegment(idx) {
    if (!segments.length) {
      targetRoot.visible = false;
      return;
    }
    targetIndex = ((idx % segments.length) + segments.length) % segments.length;
    const seg = segments[targetIndex];
    // Prefer far end (b); face target toward mid of segment
    targetRoot.position.set(seg.bx, 0, seg.bz);
    const faceYaw = Math.atan2(seg.ax - seg.bx, seg.az - seg.bz);
    targetRoot.rotation.y = faceYaw;
    targetRoot.visible = true;
  }

  function cycleTarget(dir = 1) {
    if (!segments.length) return;
    placeTargetAtSegment(targetIndex + dir);
  }

  function setLaserOn(on) {
    laserOn = !!on;
    if (!laserOn) {
      beam.visible = false;
      groundDot.visible = false;
      hitSpark.visible = false;
      onTarget = false;
      boxMat.emissiveIntensity = 0.15;
    }
  }

  function toggleLaser() {
    setLaserOn(!laserOn);
    return laserOn;
  }

  // Seed first target
  placeTargetAtSegment(0);

  /**
   * Update beam + on-target test.
   * @returns {{ onTarget: boolean, laserOn: boolean, segment: object|null, targetIndex: number }}
   */
  function update(vehicle) {
    if (!laserOn || !segments.length) {
      beam.visible = false;
      groundDot.visible = false;
      hitSpark.visible = false;
      onTarget = false;
      return { onTarget: false, laserOn, segment: null, targetIndex };
    }

    vehicle.getLaserEmitterWorld(emitterWorld);
    vehicle.getAimDir(aim2);
    const seg = segments[targetIndex];

    const tx = targetRoot.position.x;
    const tz = targetRoot.position.z;
    const toTx = tx - emitterWorld.x;
    const toTz = tz - emitterWorld.z;
    const dist = Math.hypot(toTx, toTz) || 1e-6;
    const toDirX = toTx / dist;
    const toDirZ = toTz / dist;

    // Angular alignment of aim vs direction to target
    const dot = aim2.x * toDirX + aim2.y * toDirZ;
    const cross = aim2.x * toDirZ - aim2.y * toDirX;
    const angle = Math.acos(THREE.MathUtils.clamp(dot, -1, 1));

    // Lateral miss at target plane
    const lateral = Math.abs(cross) * dist;

    // Also check tip is near the guide line corridor
    vehicle.getNozzleWorld(nozzleWorld);
    const lineLat = distPointToSegment(
      nozzleWorld.x,
      nozzleWorld.z,
      seg.ax,
      seg.az,
      seg.bx,
      seg.bz
    );

    onTarget =
      angle < ON_TARGET_ANGLE &&
      lateral < ON_TARGET_LATERAL &&
      lineLat < 1.4 &&
      dist > 1.5 &&
      dist < 55 &&
      dot > 0.5;

    // Beam endpoint: toward target (clamp length)
    const beamLen = Math.min(dist, 48);
    const endX = emitterWorld.x + aim2.x * beamLen;
    const endZ = emitterWorld.z + aim2.y * beamLen;
    const endY = onTarget ? 0.55 : emitterWorld.y;

    // If aiming near target, snap visual end onto target face
    let visEndX = endX;
    let visEndY = Math.max(0.05, endY * 0.3 + 0.15);
    let visEndZ = endZ;
    if (angle < 0.12 && lateral < 1.2) {
      visEndX = tx;
      visEndY = 0.55;
      visEndZ = tz;
    }

    beamPositions[0] = emitterWorld.x;
    beamPositions[1] = emitterWorld.y;
    beamPositions[2] = emitterWorld.z;
    beamPositions[3] = visEndX;
    beamPositions[4] = visEndY;
    beamPositions[5] = visEndZ;
    beam.geometry.attributes.position.needsUpdate = true;
    beam.visible = true;
    beamMat.opacity = onTarget ? 0.95 : 0.55;
    beamMat.color.setHex(onTarget ? 0x86efac : 0x4ade80);

    // Ground reference along aim
    groundDot.position.set(
      emitterWorld.x + aim2.x * 2.5,
      0.03,
      emitterWorld.z + aim2.y * 2.5
    );
    groundDot.visible = true;

    hitSpark.visible = onTarget;
    if (onTarget) {
      hitSpark.position.set(tx, 0.55, tz);
      boxMat.emissiveIntensity = 0.85;
    } else {
      boxMat.emissiveIntensity = 0.25;
    }

    return { onTarget, laserOn, segment: seg, targetIndex };
  }

  /**
   * Compute lock path from current nozzle toward target along segment.
   */
  function getLockPath(vehicle) {
    const seg = segments[targetIndex];
    if (!seg) return null;
    vehicle.getNozzleWorld(nozzleWorld);
    // Project nozzle onto segment; lock direction toward target end (b)
    const dx = seg.bx - seg.ax;
    const dz = seg.bz - seg.az;
    const len = Math.hypot(dx, dz) || 1;
    let dirX = dx / len;
    let dirZ = dz / len;
    // Face toward target from nozzle
    const toBx = seg.bx - nozzleWorld.x;
    const toBz = seg.bz - nozzleWorld.z;
    if (toBx * dirX + toBz * dirZ < 0) {
      dirX = -dirX;
      dirZ = -dirZ;
    }
    const yaw = Math.atan2(dirX, dirZ);
    // Path origin = projected point on infinite line through segment
    const toN = {
      x: nozzleWorld.x - seg.ax,
      z: nozzleWorld.z - seg.az,
    };
    const along = toN.x * (dx / len) + toN.z * (dz / len);
    const ox = seg.ax + (dx / len) * along;
    const oz = seg.az + (dz / len) * along;
    return { ox, oz, dx: dirX, dz: dirZ, yaw, segment: seg };
  }

  function dispose() {
    scene.remove(group);
  }

  return {
    group,
    segments,
    get targetIndex() {
      return targetIndex;
    },
    get laserOn() {
      return laserOn;
    },
    get onTarget() {
      return onTarget;
    },
    placeTargetAtSegment,
    cycleTarget,
    setLaserOn,
    toggleLaser,
    update,
    getLockPath,
    dispose,
  };
}

function distPointToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1e-6;
  let t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}
