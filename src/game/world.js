import * as THREE from 'three';
import { COLORS } from './missions.js';

/** Lot extents (meters) — Supercenter-scale front field, compressed for play */
export const LOT = {
  width: 100,
  depth: 72,
  paintRes: 1024,
  /** Building frontage road centerline Z (between sidewalk and stalls) */
  bfrZ: -20,
  /** Outer circulation road Z */
  ocrZ: 28,
};

/**
 * Build Supercenter-style lot: BFR/OCR, fire-lane yellow curb, EV zone,
 * cart corrals, painted islands, light poles w/ base covers, generic STORE.
 */
export function createWorld(scene) {
  const group = new THREE.Group();
  group.name = 'world';

  const paintCanvas = document.createElement('canvas');
  paintCanvas.width = LOT.paintRes;
  paintCanvas.height = LOT.paintRes;
  const pctx = paintCanvas.getContext('2d', { willReadFrequently: true });
  pctx.clearRect(0, 0, LOT.paintRes, LOT.paintRes);

  const asphaltCanvas = document.createElement('canvas');
  asphaltCanvas.width = 512;
  asphaltCanvas.height = 512;
  drawAsphaltTexture(asphaltCanvas.getContext('2d'), 512);

  const asphaltTex = new THREE.CanvasTexture(asphaltCanvas);
  asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping;
  asphaltTex.repeat.set(20, 16);
  asphaltTex.colorSpace = THREE.SRGBColorSpace;
  asphaltTex.anisotropy = 8;

  const paintTexture = new THREE.CanvasTexture(paintCanvas);
  paintTexture.colorSpace = THREE.SRGBColorSpace;
  paintTexture.anisotropy = 8;
  paintTexture.magFilter = THREE.LinearFilter;
  paintTexture.minFilter = THREE.LinearMipmapLinearFilter;

  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(LOT.width, LOT.depth),
    new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.92,
      metalness: 0.05,
      color: 0x3a3d42,
    })
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.receiveShadow = true;
  asphalt.name = 'asphalt';
  group.add(asphalt);

  const paintMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(LOT.width, LOT.depth),
    new THREE.MeshBasicMaterial({
      map: paintTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  paintMesh.rotation.x = -Math.PI / 2;
  paintMesh.position.y = 0.02;
  paintMesh.name = 'paintLayer';
  group.add(paintMesh);

  // Grass beyond lot
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 200),
    new THREE.MeshStandardMaterial({ color: 0x2d4a32, roughness: 1 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.05;
  grass.receiveShadow = true;
  group.add(grass);

  // Lot edge curbs
  addCurbs(group);

  // 6" fire-lane yellow on top + face of BFR curb (ambient — also a mission target)
  group.add(createFireLaneCurb());

  // Storefront + vestibules (ACC / GR / GM / GC) — generic labels only
  group.add(createStorefront());

  // Neighbor big-box / retail pads (generic, no trademarks)
  group.add(createNeighborPad(-62, -8, 18, 22, 'HOME'));
  group.add(createNeighborPad(58, 18, 14, 16, 'SHOPS'));
  group.add(createNeighborPad(52, -22, 12, 10, 'WASH'));

  // Light poles with base covers
  const poleSpots = [
    [-42, -18], [-42, 4], [-42, 24],
    [42, -18], [42, 4], [42, 24],
    [-18, -30], [0, -30], [18, -30],
    [-20, 30], [0, 30], [20, 30],
    [-28, 10], [28, 10],
  ];
  for (const [x, z] of poleSpots) group.add(createLightPole(x, z));

  // Cart corrals (~plan: many corrals in field)
  for (const [x, z] of [
    [-36, 20], [-20, 20], [12, 20], [28, 20],
    [-36, -14], [30, -14],
  ]) {
    group.add(createCartCorral(x, z));
  }
  group.add(createLooseCarts(-32, 22));

  // Painted island (ambient yellow hashes) — mid lot
  group.add(createPaintedIsland(22, 9, 2.6, 4.2));
  group.add(createPaintedIsland(-38, 9, 2.2, 3.6));

  // EV parking zone (6 stalls) with pavement cue boxes — left OCR side
  group.add(createEVZone(-44, 14));

  // Faded ambient stall ghosts so lot feels pre-striped in other bays
  group.add(createAmbientStallGuides());

  // Soft BFR / OCR lane edge hints
  group.add(createLaneHints());

  scene.add(group);

  function updatePaint() {
    paintTexture.needsUpdate = true;
  }
  function clearPaint() {
    pctx.clearRect(0, 0, LOT.paintRes, LOT.paintRes);
    updatePaint();
  }

  return {
    group,
    asphalt,
    paintMesh,
    paintCanvas,
    paintCtx: pctx,
    paintTexture,
    updatePaint,
    clearPaint,
  };
}

export function worldToPaintUV(x, z) {
  const u = (x / LOT.width + 0.5) * LOT.paintRes;
  const v = (z / LOT.depth + 0.5) * LOT.paintRes;
  return { u, v };
}

export function paintUVToWorld(u, v) {
  return {
    x: (u / LOT.paintRes - 0.5) * LOT.width,
    z: (v / LOT.paintRes - 0.5) * LOT.depth,
  };
}

function drawAsphaltTexture(ctx, size) {
  ctx.fillStyle = '#3a3d42';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4200; i++) {
    const g = 40 + Math.random() * 40;
    ctx.fillStyle = `rgba(${g},${g},${g + 5},${0.08 + Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1);
  }
  ctx.strokeStyle = 'rgba(20,20,22,0.22)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let j = 0; j < 6; j++) {
      x += (Math.random() - 0.5) * 40;
      y += (Math.random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function addCurbs(group) {
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.85 });
  const curbGeo = new THREE.BoxGeometry(LOT.width + 1.4, 0.22, 0.55);
  for (const z of [-LOT.depth / 2 - 0.1, LOT.depth / 2 + 0.1]) {
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(0, 0.05, z);
    curb.castShadow = true;
    curb.receiveShadow = true;
    group.add(curb);
  }
  const sideGeo = new THREE.BoxGeometry(0.55, 0.22, LOT.depth);
  for (const x of [-LOT.width / 2 - 0.1, LOT.width / 2 + 0.1]) {
    const curb = new THREE.Mesh(sideGeo, curbMat);
    curb.position.set(x, 0.05, 0);
    curb.castShadow = true;
    group.add(curb);
  }
}

/** Fire lane: traffic yellow on curb top + face along BFR (building side of lot) */
function createFireLaneCurb() {
  const g = new THREE.Group();
  g.name = 'fireLane';
  const yel = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.55,
    metalness: 0.05,
    emissive: 0x854d0e,
    emissiveIntensity: 0.15,
  });
  const z = -LOT.depth / 2 + 0.15;
  // Top of curb stripe
  const top = new THREE.Mesh(new THREE.BoxGeometry(LOT.width - 2, 0.04, 0.2), yel);
  top.position.set(0, 0.18, z);
  g.add(top);
  // Face stripe (vertical feel on asphalt transition)
  const face = new THREE.Mesh(new THREE.BoxGeometry(LOT.width - 2, 0.16, 0.06), yel);
  face.position.set(0, 0.1, z + 0.28);
  g.add(face);
  return g;
}

function createStorefront() {
  const g = new THREE.Group();
  const buildingDepth = 14;
  const buildingWidth = 86;
  const buildingHeight = 9.5;
  const z = -LOT.depth / 2 - buildingDepth / 2 - 0.5;

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth),
    new THREE.MeshStandardMaterial({ color: 0xc4c9d1, roughness: 0.75, metalness: 0.05 })
  );
  wall.position.set(0, buildingHeight / 2, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);

  // Garden center wing (fenced feel) — right side, generic
  const garden = new THREE.Mesh(
    new THREE.BoxGeometry(16, 4.5, 10),
    new THREE.MeshStandardMaterial({ color: 0xa8b0bc, roughness: 0.8 })
  );
  garden.position.set(38, 2.25, z + 2);
  garden.castShadow = true;
  g.add(garden);
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.4 });
  for (let i = 0; i < 8; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), fenceMat);
    post.position.set(30 + i * 2, 1.1, z + buildingDepth / 2 + 0.8);
    g.add(post);
  }

  // Dark fascia
  const fascia = new THREE.Mesh(
    new THREE.BoxGeometry(buildingWidth + 0.5, 2.4, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 })
  );
  fascia.position.set(0, buildingHeight - 0.7, z + buildingDepth / 2 + 0.18);
  fascia.castShadow = true;
  g.add(fascia);

  // Generic STORE letters
  const letterMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x334155,
    emissiveIntensity: 0.25,
    roughness: 0.4,
  });
  const word = 'STORE';
  const letterW = 1.7;
  const gap = 0.4;
  const total = word.length * letterW + (word.length - 1) * gap;
  let lx = -total / 2;
  for (const ch of word) {
    const letter = new THREE.Mesh(
      new THREE.BoxGeometry(letterW * (ch === 'I' ? 0.45 : 1), 1.15, 0.28),
      letterMat
    );
    letter.position.set(lx + letterW / 2, buildingHeight - 0.7, z + buildingDepth / 2 + 0.45);
    g.add(letter);
    lx += letterW + gap;
  }

  // Vestibule recesses: ACC, GR, GM, GC (labels as small plaques — not trademarked)
  const vestibules = [
    { x: -28, label: 'ACC' },
    { x: -10, label: 'GR' },
    { x: 8, label: 'GM' },
    { x: 26, label: 'GC' },
  ];
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    roughness: 0.12,
    metalness: 0.55,
    transparent: true,
    opacity: 0.5,
  });
  const plaqueMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
  for (const v of vestibules) {
    const entrance = new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.2, 1.4), new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.25,
    }));
    entrance.position.set(v.x, 2.1, z + buildingDepth / 2 + 0.25);
    g.add(entrance);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.2, 0.12), glassMat);
    glass.position.set(v.x, 2.2, z + buildingDepth / 2 + 0.95);
    g.add(glass);
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.08), plaqueMat);
    plaque.position.set(v.x, 4.5, z + buildingDepth / 2 + 1.0);
    g.add(plaque);
  }

  // Sidewalk along BFR
  const walk = new THREE.Mesh(
    new THREE.BoxGeometry(buildingWidth + 6, 0.12, 4.5),
    new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 })
  );
  walk.position.set(0, 0.04, -LOT.depth / 2 - 2.0);
  walk.receiveShadow = true;
  g.add(walk);

  // Bollards along BFR sidewalk
  const bollardMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.3 });
  for (let i = -8; i <= 8; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.0, 10), bollardMat);
    b.position.set(i * 4.5, 0.5, -LOT.depth / 2 - 0.4);
    b.castShadow = true;
    g.add(b);
  }

  return g;
}

function createNeighborPad(x, z, w, d, label) {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(w, 5, d),
    new THREE.MeshStandardMaterial({ color: 0xb0b7c1, roughness: 0.8 })
  );
  pad.position.set(x, 2.5, z);
  pad.castShadow = true;
  g.add(pad);
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.7, 0.8, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x334155 })
  );
  band.position.set(x, 4.2, z + d / 2 + 0.05);
  g.add(band);
  return g;
}

function createLightPole(x, z) {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.6, roughness: 0.4 });
  // Base cover (poletector-style)
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.5, 0.55, 12),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 })
  );
  base.position.set(x, 0.28, z);
  base.castShadow = true;
  g.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 8), poleMat);
  pole.position.set(x, 4.5, z);
  pole.castShadow = true;
  g.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), poleMat);
  arm.position.set(x + 0.9, 8.9, z);
  g.add(arm);

  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.25, 0.5),
    new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    })
  );
  lamp.position.set(x + 1.8, 8.75, z);
  g.add(lamp);

  const light = new THREE.PointLight(0xffe4a8, 1.25, 30, 2);
  light.position.set(x + 1.8, 8.5, z);
  g.add(light);
  return g;
}

function createCartCorral(x, z) {
  const g = new THREE.Group();
  const railMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.5, roughness: 0.45 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 0.08), railMat);
  rail.position.set(x, 0.55, z - 1.1);
  rail.castShadow = true;
  g.add(rail);
  const rail2 = rail.clone();
  rail2.position.z = z + 1.1;
  g.add(rail2);
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 2.2), railMat);
  side.position.set(x - 1.55, 0.55, z);
  g.add(side);
  const side2 = side.clone();
  side2.position.x = x + 1.55;
  g.add(side2);
  for (let i = 0; i < 4; i++) g.add(createCart(x - 0.9 + i * 0.55, z, 0.1));
  return g;
}

function createCart(x, z, rot = 0) {
  const g = new THREE.Group();
  const basket = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.45, 0.95),
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.7,
      roughness: 0.35,
      transparent: true,
      opacity: 0.85,
    })
  );
  basket.position.set(0, 0.55, 0);
  basket.castShadow = true;
  g.add(basket);
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.03, 6, 12, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.4 })
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0.85, -0.5);
  g.add(handle);
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

function createLooseCarts(x, z) {
  const g = new THREE.Group();
  g.add(createCart(x, z, 0.4));
  g.add(createCart(x + 1.2, z + 0.3, -0.2));
  return g;
}

/** 4" yellow island with 45°-feel hashes @ ~2' O.C. */
function createPaintedIsland(x, z, w, d) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xeab308,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const border = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({
    color: 0xca8a04,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  }));
  border.rotation.x = -Math.PI / 2;
  border.position.set(x, 0.035, z);
  g.add(border);
  const spacing = 0.6;
  const count = Math.floor(d / spacing);
  for (let i = 0; i < count; i++) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, 0.1), mat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.rotation.z = Math.PI / 4;
    stripe.position.set(x, 0.04, z - d / 2 + 0.3 + i * spacing);
    g.add(stripe);
  }
  return g;
}

/** EV zone: 6 stalls with green-tinted pads + ONLY cue markers (no brand logos) */
function createEVZone(x, z) {
  const g = new THREE.Group();
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    roughness: 0.85,
    transparent: true,
    opacity: 0.35,
  });
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0x86efac,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  for (let i = 0; i < 6; i++) {
    const ox = x;
    const oz = z + i * 3.0;
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(ox, 0.03, oz);
    g.add(pad);
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.08), lineMat);
    frame.rotation.x = -Math.PI / 2;
    frame.position.set(ox, 0.04, oz - 1.25);
    g.add(frame);
    // Charger pedestal
    const ped = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 1.4, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.4 })
    );
    ped.position.set(ox - 1.6, 0.7, oz);
    ped.castShadow = true;
    g.add(ped);
  }
  return g;
}

function createAmbientStallGuides() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
  });
  for (let row = 0; row < 2; row++) {
    const z0 = row === 0 ? -6 : 12;
    for (let i = 0; i <= 12; i++) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 5.5), mat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(-30 + i * 2.75, 0.03, z0 + 2.75);
      g.add(line);
    }
  }
  return g;
}

function createLaneHints() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xf5c518,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  // Dashed OCR centerline feel
  for (let i = -8; i <= 8; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.4), mat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(i * 5.5, 0.03, LOT.ocrZ);
    g.add(dash);
  }
  return g;
}

/**
 * Translucent ghost guide meshes for a mission.
 */
export function createGuideOverlays(mission, mode) {
  const group = new THREE.Group();
  group.name = 'guides';
  const opacity = mode === 'practice' ? 0.55 : 0.35;

  for (const r of mission.rects) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS[r.color] || '#fff'),
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(r.x + r.w / 2, 0.045, r.z + r.d / 2);
    mesh.userData.guide = true;
    group.add(mesh);
  }

  for (const poly of mission.polys) {
    if (poly.points.length < 2) continue;
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS[poly.color] || '#fff'),
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < poly.points.length - 1; i++) {
      const a = poly.points[i];
      const b = poly.points[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 0.01;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(poly.width, len), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = Math.atan2(dx, dz);
      mesh.position.set((a.x + b.x) / 2, 0.05, (a.z + b.z) / 2);
      group.add(mesh);
    }
  }

  return group;
}
