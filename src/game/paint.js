import * as THREE from 'three';
import { COLORS } from './missions.js';
import { LOT, worldToPaintUV } from './world.js';

/**
 * Spray paint onto the lot canvas and spawn ephemeral spray particles.
 */
export function createPaintSystem(world, scene) {
  const particles = [];
  const particleGeo = new THREE.SphereGeometry(0.04, 6, 6);
  const mats = {
    white: new THREE.MeshBasicMaterial({ color: COLORS.white, transparent: true, opacity: 0.85 }),
    yellow: new THREE.MeshBasicMaterial({ color: COLORS.yellow, transparent: true, opacity: 0.85 }),
    blue: new THREE.MeshBasicMaterial({ color: COLORS.blue, transparent: true, opacity: 0.85 }),
  };

  const nozzlePos = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function paintAt(x, z, colorName, radiusWorld = 0.18, strength = 0.85) {
    const { u, v } = worldToPaintUV(x, z);
    const ctx = world.paintCtx;
    const r = (radiusWorld / LOT.width) * LOT.paintRes;
    const color = COLORS[colorName] || '#fff';

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = strength;
    const grad = ctx.createRadialGradient(u, v, 0, u, v, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.65, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(u, v, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    world.updatePaint();
  }

  function spray(vehicle) {
    if (!vehicle.state.spraying) return;
    vehicle.getNozzleWorld(nozzlePos);
    const gx = nozzlePos.x;
    const gz = nozzlePos.z;
    const count = 3;
    for (let i = 0; i < count; i++) {
      const jx = (Math.random() - 0.5) * 0.12;
      const jz = (Math.random() - 0.5) * 0.12;
      paintAt(gx + jx, gz + jz, vehicle.state.color, 0.16 + Math.random() * 0.06, 0.7);
    }

    if (particles.length < 80 && Math.random() < 0.7) {
      const mat = mats[vehicle.state.color] || mats.white;
      const p = new THREE.Mesh(particleGeo, mat);
      p.position.copy(nozzlePos);
      p.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        -1.5 - Math.random(),
        (Math.random() - 0.5) * 0.8
      );
      p.userData.life = 0.35 + Math.random() * 0.25;
      scene.add(p);
      particles.push(p);
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.userData.life -= dt;
      p.position.addScaledVector(p.userData.vel, dt);
      p.userData.vel.y -= 6 * dt;
      p.material.opacity = Math.max(0, p.userData.life * 2);
      if (p.userData.life <= 0 || p.position.y < 0.02) {
        scene.remove(p);
        particles.splice(i, 1);
      }
    }
  }

  function update(vehicle, dt) {
    spray(vehicle);
    updateParticles(dt);
  }

  function dispose() {
    for (const p of particles) scene.remove(p);
    particles.length = 0;
  }

  return { paintAt, update, dispose, nozzlePos: tmp };
}

/**
 * Score mission coverage from paint canvas vs guide geometry.
 * Supports rotated rects (`rot` = yaw radians, position is center).
 */
export function scoreMission(world, mission) {
  const ctx = world.paintCtx;
  const { width: W, height: H } = world.paintCanvas;
  const image = ctx.getImageData(0, 0, W, H);
  const data = image.data;

  const colorTargets = {
    white: { r: 242, g: 244, b: 247 },
    yellow: { r: 245, g: 197, b: 24 },
    blue: { r: 43, g: 108, b: 176 },
  };

  function samplePixel(u, v) {
    const x = Math.max(0, Math.min(W - 1, Math.floor(u)));
    const y = Math.max(0, Math.min(H - 1, Math.floor(v)));
    const i = (y * W + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
  }

  function colorMatch(px, name, tol = 70) {
    if (px.a < 40) return false;
    const t = colorTargets[name];
    if (!t) return false;
    return (
      Math.abs(px.r - t.r) < tol &&
      Math.abs(px.g - t.g) < tol &&
      Math.abs(px.b - t.b) < tol
    );
  }

  function nearestAllowed(px, allowed) {
    if (px.a < 40) return null;
    let best = null;
    let bestDist = Infinity;
    for (const name of allowed) {
      const t = colorTargets[name];
      const d = Math.abs(px.r - t.r) + Math.abs(px.g - t.g) + Math.abs(px.b - t.b);
      if (d < bestDist) {
        bestDist = d;
        best = name;
      }
    }
    return bestDist < 120 ? best : null;
  }

  let guideSamples = 0;
  let guideHits = 0;
  let wrongColor = 0;

  function sampleWorld(wx, wz, color) {
    const { u, v } = worldToPaintUV(wx, wz);
    const px = samplePixel(u, v);
    guideSamples++;
    if (colorMatch(px, color)) {
      guideHits++;
    } else if (px.a > 50) {
      const nearest = nearestAllowed(px, [color, ...mission.allowedColors]);
      if (nearest && nearest !== color) wrongColor++;
    }
  }

  function sampleRect(r) {
    const stepsX = Math.max(4, Math.ceil(r.w * 14));
    const stepsZ = Math.max(4, Math.ceil(r.d * 14));
    if (r.rot) {
      const cos = Math.cos(r.rot);
      const sin = Math.sin(r.rot);
      for (let iz = 0; iz <= stepsZ; iz++) {
        for (let ix = 0; ix <= stepsX; ix++) {
          const lx = (ix / stepsX - 0.5) * r.w;
          const lz = (iz / stepsZ - 0.5) * r.d;
          const wx = r.x + lx * cos + lz * sin;
          const wz = r.z - lx * sin + lz * cos;
          sampleWorld(wx, wz, r.color);
        }
      }
    } else {
      for (let iz = 0; iz <= stepsZ; iz++) {
        for (let ix = 0; ix <= stepsX; ix++) {
          const wx = r.x + (ix / stepsX) * r.w;
          const wz = r.z + (iz / stepsZ) * r.d;
          sampleWorld(wx, wz, r.color);
        }
      }
    }
  }

  function samplePoly(poly) {
    for (let i = 0; i < poly.points.length - 1; i++) {
      const a = poly.points[i];
      const b = poly.points[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const steps = Math.max(6, Math.ceil(len * 16));
      const nx = -(b.z - a.z) / (len || 1);
      const nz = (b.x - a.x) / (len || 1);
      const half = poly.width / 2;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = a.x + (b.x - a.x) * t;
        const cz = a.z + (b.z - a.z) * t;
        for (const o of [-half, 0, half]) {
          sampleWorld(cx + nx * o, cz + nz * o, poly.color);
        }
      }
    }
  }

  for (const r of mission.rects) sampleRect(r);
  for (const p of mission.polys) samplePoly(p);

  let overspraySamples = 0;
  let oversprayHits = 0;
  const pads = buildGuideMask(mission);

  for (let n = 0; n < 900; n++) {
    const wx = (Math.random() - 0.5) * LOT.width * 0.9;
    const wz = (Math.random() - 0.5) * LOT.depth * 0.9;
    if (pads.isInside(wx, wz)) continue;
    overspraySamples++;
    const { u, v } = worldToPaintUV(wx, wz);
    const px = samplePixel(u, v);
    if (px.a > 60) oversprayHits++;
  }

  const coverage = guideSamples ? (guideHits / guideSamples) * 100 : 0;
  const oversprayRate = overspraySamples ? oversprayHits / overspraySamples : 0;
  const oversprayPenalty = Math.min(35, oversprayRate * 100 * 0.9);
  const wrongPenalty = Math.min(25, (wrongColor / Math.max(1, guideSamples)) * 100 * 2.5);

  const score = Math.max(0, Math.min(100, coverage * 0.95 - oversprayPenalty - wrongPenalty));

  return {
    score: Math.round(score * 10) / 10,
    coverage: Math.round(coverage * 10) / 10,
    overspray: Math.round(oversprayPenalty * 10) / 10,
    wrongColor: Math.round(wrongPenalty * 10) / 10,
    guideHits,
    guideSamples,
  };
}

function buildGuideMask(mission) {
  const rects = mission.rects.map((r) => ({ ...r, pad: 0.55 }));
  const polys = mission.polys;

  function inRect(wx, wz, r) {
    const pad = r.pad || 0.4;
    if (r.rot) {
      const cos = Math.cos(r.rot);
      const sin = Math.sin(r.rot);
      const dx = wx - r.x;
      const dz = wz - r.z;
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      return Math.abs(lx) <= r.w / 2 + pad && Math.abs(lz) <= r.d / 2 + pad;
    }
    return (
      wx >= r.x - pad &&
      wx <= r.x + r.w + pad &&
      wz >= r.z - pad &&
      wz <= r.z + r.d + pad
    );
  }

  function nearPoly(wx, wz, poly) {
    const pad = poly.width / 2 + 0.5;
    for (let i = 0; i < poly.points.length - 1; i++) {
      const a = poly.points[i];
      const b = poly.points[i + 1];
      const dist = distToSegment(wx, wz, a.x, a.z, b.x, b.z);
      if (dist < pad) return true;
    }
    return false;
  }

  return {
    isInside(wx, wz) {
      for (const r of rects) if (inRect(wx, wz, r)) return true;
      for (const p of polys) if (nearPoly(wx, wz, p)) return true;
      return false;
    },
  };
}

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1e-6;
  let t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx;
  const qz = az + t * dz;
  return Math.hypot(px - qx, pz - qz);
}
