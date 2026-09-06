import * as THREE from 'three';
import { COLORS } from './missions.js';

/**
 * #2855 Supercenter front field (meters).
 * X: west → east (− → +). Z: north → south (− → +) so plan north sits at −Z.
 * Plan texture provides visual fidelity; 3D boxes + playable bounds focus the frontage.
 */
export const LOT = {
  width: 130,
  depth: 95,
  paintRes: 1024,
  planW: 200,
  planD: 178,
  bfrZ: -22,
  ocrZ: 28,
};

const PLAN_URL = `${import.meta.env.BASE_URL}walmart-plan-2855.jpg`;

/**
 * Build plan-accurate lot: #2855 sheet as ground decal + extruded massing.
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
  asphaltTex.repeat.set(28, 24);
  asphaltTex.colorSpace = THREE.SRGBColorSpace;
  asphaltTex.anisotropy = 8;

  const paintTexture = new THREE.CanvasTexture(paintCanvas);
  paintTexture.colorSpace = THREE.SRGBColorSpace;
  paintTexture.anisotropy = 8;
  paintTexture.magFilter = THREE.LinearFilter;
  paintTexture.minFilter = THREE.LinearMipmapLinearFilter;

  // Base asphalt under everything
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(LOT.planW + 40, LOT.planD + 40),
    new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.95,
      metalness: 0.04,
      color: 0x3a3d42,
    })
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.y = 0;
  asphalt.receiveShadow = true;
  asphalt.name = 'asphalt';
  group.add(asphalt);

  // Real #2855 site plan as ground decal (north = −Z)
  const planMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.02,
    transparent: true,
    opacity: 0.92,
  });
  const planMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(LOT.planW, LOT.planD),
    planMat
  );
  planMesh.rotation.x = -Math.PI / 2;
  planMesh.position.y = 0.012;
  planMesh.receiveShadow = true;
  planMesh.name = 'planDecal';
  group.add(planMesh);

  const loader = new THREE.TextureLoader();
  loader.load(
    PLAN_URL,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      planMat.map = tex;
      planMat.needsUpdate = true;
    },
    undefined,
    () => {
      console.warn('Plan texture failed to load — asphalt fallback');
    }
  );

  // Player paint layer (above plan)
  const paintMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(LOT.width, LOT.depth),
    new THREE.MeshBasicMaterial({
      map: paintTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
  );
  paintMesh.rotation.x = -Math.PI / 2;
  paintMesh.position.y = 0.028;
  paintMesh.name = 'paintLayer';
  group.add(paintMesh);

  // Grass beyond plan
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 360),
    new THREE.MeshStandardMaterial({ color: 0x2d4a32, roughness: 1 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.06;
  grass.receiveShadow = true;
  group.add(grass);

  addCurbs(group);
  group.add(createFireLaneCurb());
  group.add(createStorefront());
  group.add(createNeighborPad(-78, -8, 28, 36, 'HOME'));
  group.add(createNeighborPad(72, 42, 18, 14, 'SHOPS'));
  group.add(createNeighborPad(18, 58, 16, 12, 'PAD'));

  // Light poles — front field / islands-ish positions from plan
  const poleSpots = [
    [-48, -18], [-32, -18], [-12, -18], [8, -18], [28, -18], [48, -16],
    [-50, 2], [-28, 4], [-6, 4], [16, 4], [38, 6],
    [-46, 22], [-22, 24], [2, 24], [26, 24], [48, 22],
    [-40, 40], [-10, 42], [20, 42], [44, 38],
    [-55, -30], [55, -28],
  ];
  for (const [x, z] of poleSpots) group.add(createLightPole(x, z));

  // Cart corrals in front banks
  for (const [x, z] of [
    [-40, -6], [-18, -6], [6, -6], [28, -4],
    [-38, 14], [-14, 14], [12, 14], [34, 16],
    [-36, 32], [0, 34], [30, 32],
  ]) {
    group.add(createCartCorral(x, z));
  }
  group.add(createLooseCarts(-42, -4));

  group.add(createPaintedIsland(34, 8, 2.8, 4.4));
  group.add(createPaintedIsland(-44, 8, 2.4, 3.8));
  group.add(createEVZone(-52, 6));

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

/** Fire lane yellow along BFR (building frontage, north edge of playable lot) */
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
  const z = LOT.bfrZ - 6.5;
  const top = new THREE.Mesh(new THREE.BoxGeometry(LOT.width - 8, 0.04, 0.22), yel);
  top.position.set(0, 0.18, z);
  g.add(top);
  const face = new THREE.Mesh(new THREE.BoxGeometry(LOT.width - 8, 0.16, 0.06), yel);
  face.position.set(0, 0.1, z + 0.28);
  g.add(face);
  return g;
}

function createStorefront() {
  const g = new THREE.Group();
  // Main Supercenter massing — north of BFR, aligned to plan texture
  const buildingDepth = 28;
  const buildingWidth = 96;
  const buildingHeight = 10.5;
  const z = -52;

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth),
    new THREE.MeshStandardMaterial({ color: 0xc4c9d1, roughness: 0.75, metalness: 0.05 })
  );
  wall.position.set(4, buildingHeight / 2, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);

  // ACC protrusion (east / right of frontage)
  const acc = new THREE.Mesh(
    new THREE.BoxGeometry(22, 7.5, 18),
    new THREE.MeshStandardMaterial({ color: 0xb8bfc9, roughness: 0.78 })
  );
  acc.position.set(42, 3.75, z + 6);
  acc.castShadow = true;
  g.add(acc);

  // Garden center fence / wing further east
  const garden = new THREE.Mesh(
    new THREE.BoxGeometry(20, 4.2, 16),
    new THREE.MeshStandardMaterial({ color: 0xa8b0bc, roughness: 0.8 })
  );
  garden.position.set(58, 2.1, z + 4);
  garden.castShadow = true;
  g.add(garden);
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.4 });
  for (let i = 0; i < 10; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), fenceMat);
    post.position.set(48 + i * 2.1, 1.1, z + buildingDepth / 2 - 2);
    g.add(post);
  }

  // Truck wells (north side recesses — simple boxes)
  const wellMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
  const grWell = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 10), wellMat);
  grWell.position.set(-36, 2.5, z - 12);
  grWell.castShadow = true;
  g.add(grWell);
  const gmWell = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 10), wellMat);
  gmWell.position.set(10, 2.5, z - 12);
  gmWell.castShadow = true;
  g.add(gmWell);

  // Dark fascia
  const fascia = new THREE.Mesh(
    new THREE.BoxGeometry(buildingWidth + 0.5, 2.6, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 })
  );
  fascia.position.set(4, buildingHeight - 0.8, z + buildingDepth / 2 + 0.18);
  fascia.castShadow = true;
  g.add(fascia);

  // Generic STORE letters (no trademarks)
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
  let lx = 4 - total / 2;
  for (const ch of word) {
    const letter = new THREE.Mesh(
      new THREE.BoxGeometry(letterW * (ch === 'I' ? 0.45 : 1), 1.15, 0.28),
      letterMat
    );
    letter.position.set(lx + letterW / 2, buildingHeight - 0.8, z + buildingDepth / 2 + 0.45);
    g.add(letter);
    lx += letterW + gap;
  }

  // Vestibules ACC / GR / GM / GC along south facade
  const vestibules = [
    { x: -28, label: 'GR' },
    { x: -6, label: 'GM' },
    { x: 18, label: 'GC' },
    { x: 42, label: 'ACC' },
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
    const entrance = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 4.2, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.25 })
    );
    entrance.position.set(v.x, 2.1, z + buildingDepth / 2 + 0.3);
    g.add(entrance);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.2, 0.12), glassMat);
    glass.position.set(v.x, 2.2, z + buildingDepth / 2 + 1.05);
    g.add(glass);
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.38, 0.08), plaqueMat);
    plaque.position.set(v.x, 4.5, z + buildingDepth / 2 + 1.1);
    g.add(plaque);
  }

  // Sidewalk along BFR
  const walk = new THREE.Mesh(
    new THREE.BoxGeometry(buildingWidth + 20, 0.12, 5.2),
    new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 })
  );
  walk.position.set(6, 0.04, z + buildingDepth / 2 + 3.2);
  walk.receiveShadow = true;
  g.add(walk);

  const bollardMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.3 });
  for (let i = -10; i <= 12; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.0, 10), bollardMat);
    b.position.set(i * 4.2, 0.5, z + buildingDepth / 2 + 1.2);
    b.castShadow = true;
    g.add(b);
  }

  return g;
}

function createNeighborPad(x, z, w, d, label) {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(w, 5.5, d),
    new THREE.MeshStandardMaterial({ color: 0xb0b7c1, roughness: 0.8 })
  );
  pad.position.set(x, 2.75, z);
  pad.castShadow = true;
  g.add(pad);
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.7, 0.8, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x334155 })
  );
  band.position.set(x, 4.6, z + d / 2 + 0.05);
  g.add(band);
  return g;
}

function createLightPole(x, z) {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.6, roughness: 0.4 });
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

  const light = new THREE.PointLight(0xffe4a8, 0.85, 28, 2);
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

function createPaintedIsland(x, z, w, d) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xeab308,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({
      color: 0xca8a04,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    })
  );
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

function createEVZone(x, z) {
  const g = new THREE.Group();
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    roughness: 0.85,
    transparent: true,
    opacity: 0.28,
  });
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0x86efac,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  for (let i = 0; i < 6; i++) {
    const oz = z + i * 3.0;
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.03, oz);
    g.add(pad);
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.08), lineMat);
    frame.rotation.x = -Math.PI / 2;
    frame.position.set(x, 0.04, oz - 1.25);
    g.add(frame);
    const ped = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 1.4, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.4 })
    );
    ped.position.set(x - 1.6, 0.7, oz);
    ped.castShadow = true;
    g.add(ped);
  }
  return g;
}

/**
 * Ghost guide meshes. Rects support optional `rot` (radians, yaw).
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
    if (r.rot) mesh.rotation.z = r.rot;
    // Position is rect center when rotated; axis-aligned still use corner+half
    if (r.rot) {
      mesh.position.set(r.x, 0.05, r.z);
    } else {
      mesh.position.set(r.x + r.w / 2, 0.05, r.z + r.d / 2);
    }
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
      mesh.position.set((a.x + b.x) / 2, 0.055, (a.z + b.z) / 2);
      group.add(mesh);
    }
  }

  return group;
}
