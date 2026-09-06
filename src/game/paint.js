import * as THREE from 'three';
import { COLORS } from './missions.js';
import { LOT, worldToPaintUV } from './world.js';

/** Real 4" tip band in world meters (~0.1016 m). */
export const TIP_WIDTH = 0.102;
/** Ideal striping speed (world units/s) for a good coat. */
const IDEAL_SPEED = 2.4;
const SPEED_GOOD_MIN = 0.6;
const SPEED_GOOD_MAX = 4.2;

/**
 * Continuous airless tip stripe onto the lot paint canvas.
 * Locked = smooth professional coat; freehand / bad speed = soft overspray.
 */
export function createPaintSystem(world, scene) {
  const mist = [];
  const mistGeo = new THREE.SphereGeometry(0.03, 6, 6);
  const mistMats = {
    white: new THREE.MeshBasicMaterial({ color: COLORS.white, transparent: true, opacity: 0.55 }),
    yellow: new THREE.MeshBasicMaterial({ color: COLORS.yellow, transparent: true, opacity: 0.55 }),
    blue: new THREE.MeshBasicMaterial({ color: COLORS.blue, transparent: true, opacity: 0.55 }),
  };

  const nozzlePos = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let lastX = null;
  let lastZ = null;
  let wasSpraying = false;
  let paintDirty = false;
  let framesSinceUpload = 0;

  function hexToRgba(hex, a) {
    const c = hex.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  /**
   * Draw a smooth capsule stripe from (x0,z0) → (x1,z1) in world space.
   */
  function strokeSegment(x0, z0, x1, z1, colorName, widthWorld, quality) {
    const ctx = world.paintCtx;
    const a = worldToPaintUV(x0, z0);
    const b = worldToPaintUV(x1, z1);
    const pxPerMeter = LOT.paintRes / LOT.width;
    const halfW = (widthWorld / 2) * pxPerMeter;
    const color = COLORS[colorName] || '#fff';

    const dx = b.u - a.u;
    const dv = b.v - a.v;
    const len = Math.hypot(dx, dv);
    const ang = Math.atan2(dv, dx);

    // Soft edge layers — core solid, feathered sides (real airless tip look)
    const layers =
      quality >= 0.85
        ? [
            { scale: 1.35, alpha: 0.18 },
            { scale: 1.12, alpha: 0.35 },
            { scale: 1.0, alpha: 0.72 },
            { scale: 0.82, alpha: 0.92 },
          ]
        : quality >= 0.5
          ? [
              { scale: 1.55, alpha: 0.14 },
              { scale: 1.2, alpha: 0.32 },
              { scale: 1.0, alpha: 0.55 },
              { scale: 0.75, alpha: 0.7 },
            ]
          : [
              { scale: 1.9, alpha: 0.1 },
              { scale: 1.4, alpha: 0.22 },
              { scale: 1.05, alpha: 0.4 },
              { scale: 0.7, alpha: 0.5 },
            ];

    ctx.save();
    ctx.translate(a.u, a.v);
    ctx.rotate(ang);
    ctx.globalCompositeOperation = 'source-over';

    for (const layer of layers) {
      const hw = halfW * layer.scale;
      const cap = hw;
      ctx.globalAlpha = layer.alpha;
      // Capsule: round rect along segment
      roundRect(ctx, -cap, -hw, len + cap * 2, hw * 2, hw);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Extra feather at edges for locked professional coat
    if (quality >= 0.85) {
      ctx.globalAlpha = 0.25;
      const grad = ctx.createLinearGradient(0, -halfW * 1.2, 0, halfW * 1.2);
      const edge = hexToRgba(color, 0);
      const mid = hexToRgba(color, 0.35);
      grad.addColorStop(0, edge);
      grad.addColorStop(0.22, mid);
      grad.addColorStop(0.5, hexToRgba(color, 0.55));
      grad.addColorStop(0.78, mid);
      grad.addColorStop(1, edge);
      ctx.fillStyle = grad;
      roundRect(ctx, -cap * 0.5, -halfW * 1.15, len + cap, halfW * 2.3, halfW);
      ctx.fill();
    }

    ctx.restore();
    paintDirty = true;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function stampDot(x, z, colorName, radiusWorld, alpha) {
    const { u, v } = worldToPaintUV(x, z);
    const ctx = world.paintCtx;
    const r = (radiusWorld / LOT.width) * LOT.paintRes;
    const color = COLORS[colorName] || '#fff';
    ctx.save();
    ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(u, v, 0, u, v, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.55, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(u, v, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    paintDirty = true;
  }

  function coatQuality(speed, locked) {
    const sp = Math.abs(speed);
    if (locked) {
      if (sp < 0.15) return 0.75; // dabbing while locked still decent
      if (sp >= SPEED_GOOD_MIN && sp <= SPEED_GOOD_MAX) return 1.0;
      if (sp < SPEED_GOOD_MIN) return 0.88;
      return Math.max(0.7, 1 - (sp - SPEED_GOOD_MAX) * 0.08);
    }
    // Freehand: harsher
    if (sp < 0.2) return 0.35;
    if (sp >= SPEED_GOOD_MIN && sp <= SPEED_GOOD_MAX) return 0.62;
    return 0.4;
  }

  function spray(vehicle) {
    if (!vehicle.state.spraying) {
      wasSpraying = false;
      lastX = null;
      lastZ = null;
      return;
    }

    vehicle.getNozzleWorld(nozzlePos);
    const gx = nozzlePos.x;
    const gz = nozzlePos.z;
    const locked = !!vehicle.state.locked;
    const speed = vehicle.state.speed;
    const q = coatQuality(speed, locked);

    // Tip width: locked = true 4"; freehand wobbles wider
    let width = TIP_WIDTH;
    if (!locked) {
      width = TIP_WIDTH * (1.15 + Math.min(0.45, Math.abs(speed) * 0.04));
    } else if (Math.abs(speed) > SPEED_GOOD_MAX) {
      width = TIP_WIDTH * (1 + (Math.abs(speed) - SPEED_GOOD_MAX) * 0.04);
    } else if (Math.abs(speed) < SPEED_GOOD_MIN && Math.abs(speed) > 0.15) {
      // Too slow → slightly heavy coat (same width, higher build via quality)
      width = TIP_WIDTH * 1.02;
    }

    if (!wasSpraying || lastX == null) {
      stampDot(gx, gz, vehicle.state.color, width * 0.55, locked ? 0.85 : 0.55);
      lastX = gx;
      lastZ = gz;
      wasSpraying = true;
      return;
    }

    const dist = Math.hypot(gx - lastX, gz - lastZ);
    // Subdivide long steps so fast motion still lays continuous coat
    const step = Math.max(0.04, width * 0.35);
    if (dist < 0.008) {
      // Nearly still — soft build-up dab
      stampDot(gx, gz, vehicle.state.color, width * 0.5, locked ? 0.35 : 0.18);
    } else if (dist <= step * 1.5) {
      strokeSegment(lastX, lastZ, gx, gz, vehicle.state.color, width, q);
    } else {
      const n = Math.ceil(dist / step);
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        strokeSegment(
          lastX + (gx - lastX) * t0,
          lastZ + (gz - lastZ) * t0,
          lastX + (gx - lastX) * t1,
          lastZ + (gz - lastZ) * t1,
          vehicle.state.color,
          width,
          q
        );
      }
    }

    // Freehand mist / overspray particles
    if (!locked && mist.length < 50 && Math.random() < 0.35) {
      const mat = mistMats[vehicle.state.color] || mistMats.white;
      const p = new THREE.Mesh(mistGeo, mat);
      p.position.copy(nozzlePos);
      p.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        -1.2 - Math.random() * 0.6,
        (Math.random() - 0.5) * 0.5
      );
      p.userData.life = 0.25 + Math.random() * 0.2;
      scene.add(p);
      mist.push(p);
    }

    // Bad-speed overspray when unlocked or flying
    if ((!locked && Math.abs(speed) > 5) || (locked && Math.abs(speed) > 6.5)) {
      const jx = (Math.random() - 0.5) * width * 1.8;
      const jz = (Math.random() - 0.5) * width * 1.8;
      stampDot(gx + jx, gz + jz, vehicle.state.color, width * 0.35, 0.2);
    }

    lastX = gx;
    lastZ = gz;
    wasSpraying = true;
  }

  function updateMist(dt) {
    for (let i = mist.length - 1; i >= 0; i--) {
      const p = mist[i];
      p.userData.life -= dt;
      p.position.addScaledVector(p.userData.vel, dt);
      p.userData.vel.y -= 6 * dt;
      p.material.opacity = Math.max(0, p.userData.life * 2);
      if (p.userData.life <= 0 || p.position.y < 0.02) {
        scene.remove(p);
        mist.splice(i, 1);
      }
    }
  }

  function flushPaint() {
    if (paintDirty) {
      world.updatePaint();
      paintDirty = false;
      framesSinceUpload = 0;
    }
  }

  function update(vehicle, dt) {
    spray(vehicle);
    updateMist(dt);
    framesSinceUpload++;
    // Batch texture uploads — every frame if spraying, else occasional
    if (paintDirty && (vehicle.state.spraying || framesSinceUpload > 2)) {
      flushPaint();
    }
  }

  function dispose() {
    for (const p of mist) scene.remove(p);
    mist.length = 0;
  }

  // Legacy single-point helper for any external callers
  function paintAt(x, z, colorName, radiusWorld = 0.1, strength = 0.85) {
    stampDot(x, z, colorName, radiusWorld, strength);
    flushPaint();
  }

  return { paintAt, update, dispose, nozzlePos: tmp, flushPaint };
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
