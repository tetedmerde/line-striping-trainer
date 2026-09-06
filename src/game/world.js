import * as THREE from 'three';
import { PLAN_W, PLAN_H } from './missions.js';
import { SCALE, planToWorld } from './coords.js';
import {
  BUILDINGS,
  ISLANDS,
  CART_CORRALS,
  LIGHT_POLES,
  FIRE_LANE,
  STOP_CROSSWALK,
  ADA_ZONES,
  STALL_BANKS,
  expandStallBank,
  VESTIBULES,
} from './lotLayout.js';

export const LOT_W = PLAN_W * SCALE;
export const LOT_D = PLAN_H * SCALE;

/**
 * Hyper-real Supercenter lot on dark PBR asphalt.
 * Geometry (stalls, islands, curbs, building) is built FROM the #2855 plan —
 * plan sheet is an optional faint debug overlay, not the ground texture.
 */
export async function createWorld(scene, renderer) {
  const group = new THREE.Group();
  group.name = 'world';

  // Soft late-morning overcast — reads like a real lot photo, not neon game lighting
  scene.fog = new THREE.FogExp2(0xc5cdd6, 0.0032);

  const hemi = new THREE.HemisphereLight(0xd6e2ef, 0x3a3834, 0.72);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2e0, 1.65);
  sun.position.set(52, 58, 34);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 2.5;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0xb8c8dc, 0.28);
  fill.position.set(-48, 22, -36);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xe8d4bc, 0.18);
  rim.position.set(8, 14, -55);
  scene.add(rim);

  const amb = new THREE.AmbientLight(0x9aa6b4, 0.18);
  scene.add(amb);

  group.add(createSky());

  // Grass beyond lot
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 320),
    new THREE.MeshStandardMaterial({ color: 0x4a6348, roughness: 0.97, metalness: 0 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.08;
  grass.receiveShadow = true;
  group.add(grass);

  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const asphaltMaps = makeAsphaltMaps(1024);
  asphaltMaps.color.wrapS = asphaltMaps.color.wrapT = THREE.RepeatWrapping;
  asphaltMaps.color.repeat.set(48, 42);
  asphaltMaps.color.colorSpace = THREE.SRGBColorSpace;
  asphaltMaps.color.anisotropy = anisotropy;
  asphaltMaps.roughness.wrapS = asphaltMaps.roughness.wrapT = THREE.RepeatWrapping;
  asphaltMaps.roughness.repeat.set(48, 42);
  asphaltMaps.roughness.anisotropy = anisotropy;

  // Primary look: real dark asphalt blacktop (NOT plan wallpaper)
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: asphaltMaps.color,
    color: 0x1e2126,
    roughness: 0.92,
    metalness: 0.02,
    roughnessMap: asphaltMaps.roughness,
    envMapIntensity: 0.18,
  });

  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(LOT_W, LOT_D), asphaltMat);
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.receiveShadow = true;
  asphalt.name = 'asphalt';
  group.add(asphalt);

  // Wet sheen
  const sheen = new THREE.Mesh(
    new THREE.PlaneGeometry(LOT_W, LOT_D),
    new THREE.MeshStandardMaterial({
      color: 0x0e1014,
      roughness: 0.35,
      metalness: 0.22,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
    })
  );
  sheen.rotation.x = -Math.PI / 2;
  sheen.position.y = 0.008;
  sheen.receiveShadow = true;
  group.add(sheen);

  // Optional faint plan reference (debug) — OFF by default
  let planOverlay = null;
  try {
    const planUrl = `${import.meta.env.BASE_URL}walmart-plan-2855.jpg`;
    const loader = new THREE.TextureLoader();
    const planTex = await loader.loadAsync(planUrl);
    planTex.colorSpace = THREE.SRGBColorSpace;
    planTex.anisotropy = anisotropy;
    planTex.wrapS = planTex.wrapT = THREE.ClampToEdgeWrapping;
    planOverlay = new THREE.Mesh(
      new THREE.PlaneGeometry(LOT_W, LOT_D),
      new THREE.MeshBasicMaterial({
        map: planTex,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      })
    );
    planOverlay.rotation.x = -Math.PI / 2;
    planOverlay.position.y = 0.012;
    planOverlay.visible = false;
    planOverlay.name = 'planOverlay';
    group.add(planOverlay);
  } catch (_) {
    // Plan asset optional
  }

  // Permanent lot striping baked into asphalt (faint guides matching plan)
  group.add(createBakedStriping());

  // Paint overlay (player coat)
  const paintCanvas = document.createElement('canvas');
  paintCanvas.width = PLAN_W;
  paintCanvas.height = PLAN_H;
  const paintTex = new THREE.CanvasTexture(paintCanvas);
  paintTex.colorSpace = THREE.SRGBColorSpace;
  paintTex.anisotropy = anisotropy;
  paintTex.magFilter = THREE.LinearFilter;
  paintTex.minFilter = THREE.LinearMipmapLinearFilter;

  const paintMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(LOT_W, LOT_D),
    new THREE.MeshStandardMaterial({
      map: paintTex,
      transparent: true,
      depthWrite: false,
      roughness: 0.45,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      emissive: 0x000000,
      emissiveIntensity: 0,
    })
  );
  paintMesh.rotation.x = -Math.PI / 2;
  paintMesh.position.y = 0.03;
  paintMesh.name = 'paintLayer';
  group.add(paintMesh);

  group.add(createLotCurbs());
  group.add(createIslands());
  group.add(createStore());
  group.add(createPad(-58, -6, 16, 20, 8));
  group.add(createPad(55, 16, 12, 14, 6));

  for (const [px, py] of LIGHT_POLES) {
    const w = planToWorld(px, py);
    group.add(createLightPole(w.x, w.z));
  }
  for (const [px, py] of CART_CORRALS) {
    const w = planToWorld(px, py);
    group.add(createCartCorral(w.x, w.z));
  }

  group.add(createHaze());
  scene.add(group);
  scene.background = new THREE.Color(0xb4c2d0);

  return {
    group,
    asphalt,
    paintMesh,
    paintTex,
    sun,
    planOverlay,
    setPlanOverlay(on) {
      if (planOverlay) planOverlay.visible = !!on;
    },
    togglePlanOverlay() {
      if (!planOverlay) return false;
      planOverlay.visible = !planOverlay.visible;
      return planOverlay.visible;
    },
    updatePaint() {
      paintTex.needsUpdate = true;
    },
  };
}

/** Faint baked striping on asphalt so the lot reads as a real striped field. */
function createBakedStriping() {
  const g = new THREE.Group();
  g.name = 'bakedStriping';

  const mats = {
    yellow: new THREE.MeshStandardMaterial({
      color: 0xb8940c,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      roughness: 0.95,
      metalness: 0,
    }),
    white: new THREE.MeshStandardMaterial({
      color: 0xc8ccd2,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      roughness: 0.95,
      metalness: 0,
    }),
    blue: new THREE.MeshStandardMaterial({
      color: 0x2a5f9e,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      roughness: 0.92,
      metalness: 0,
    }),
  };

  const addSeg = (ax, ay, bx, by, color, widthPx = 4) => {
    const a = planToWorld(ax, ay);
    const b = planToWorld(bx, by);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 0.01;
    const width = Math.max(0.06, widthPx * SCALE * 0.5);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.015, len),
      mats[color] || mats.yellow
    );
    mesh.position.set((a.x + b.x) / 2, 0.018, (a.z + b.z) / 2);
    mesh.rotation.y = Math.atan2(dx, dz);
    g.add(mesh);
  };

  for (const bank of STALL_BANKS) {
    for (const guide of expandStallBank(bank)) {
      addSeg(guide.a.x, guide.a.y, guide.b.x, guide.b.y, guide.color, guide.width);
    }
  }

  // Fire lane
  addSeg(FIRE_LANE.x0, FIRE_LANE.y, FIRE_LANE.x1, FIRE_LANE.y, 'yellow', 6);

  // Stop bar
  addSeg(
    STOP_CROSSWALK.stopX0,
    STOP_CROSSWALK.stopY,
    STOP_CROSSWALK.stopX1,
    STOP_CROSSWALK.stopY,
    'white',
    12
  );
  for (const x of STOP_CROSSWALK.cwXs) {
    addSeg(x, STOP_CROSSWALK.cwY0, x, STOP_CROSSWALK.cwY1, 'white', 8);
  }

  // ADA zones
  for (const z of ADA_ZONES) {
    addSeg(z.x0, z.y0, z.x0, z.y1, 'blue', 5);
    addSeg(z.x1, z.y0, z.x1, z.y1, 'blue', 5);
    addSeg(z.x0, z.y0, z.x1, z.y0, 'blue', 5);
    addSeg(z.x0, z.y1, z.x1, z.y1, 'blue', 5);
    const mid = (z.x0 + z.x1) / 2;
    addSeg(mid, z.y0, mid, z.y1, 'blue', 4);
    // Hashes
    for (let i = 0; i < 4; i++) {
      const t = 0.2 + i * 0.18;
      const x = z.x0 + (z.x1 - z.x0) * t;
      addSeg(x - 6, z.y0 + 10, x + 6, z.y1 - 10, 'blue', 3);
    }
  }

  // Directional arrow ghosts in aisles
  for (const [x, y0, y1] of [
    [920, 1000, 920],
    [1080, 1000, 920],
    [700, 1200, 1120],
  ]) {
    addSeg(x, y0, x, y1, 'white', 5);
  }

  return g;
}

function createSky() {
  const geo = new THREE.SphereGeometry(220, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x7a9fc4) },
      midColor: { value: new THREE.Color(0xc2d0de) },
      bottomColor: { value: new THREE.Color(0xd4cbb8) },
      offset: { value: 0.0 },
      exponent: { value: 0.7 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 p = modelMatrix * vec4(position, 1.0);
        vWorldPosition = p.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        float t = max(h, 0.0);
        vec3 col = mix(bottomColor, midColor, smoothstep(-0.15, 0.25, h));
        col = mix(col, topColor, pow(t, exponent));
        float sun = pow(max(dot(normalize(vWorldPosition), normalize(vec3(0.4, 0.55, 0.25))), 0.0), 24.0);
        col += vec3(1.0, 0.92, 0.75) * sun * 0.45;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}

function makeAsphaltMaps(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  // Worn blacktop base
  ctx.fillStyle = '#1a1d22';
  ctx.fillRect(0, 0, size, size);
  // Large-scale mottling
  for (let i = 0; i < 80; i++) {
    const g = 22 + Math.random() * 28;
    ctx.fillStyle = `rgba(${g},${g + 1},${g + 3},${0.08 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      40 + Math.random() * 120,
      25 + Math.random() * 80,
      Math.random() * Math.PI,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  // Aggregate speckles
  for (let i = 0; i < 28000; i++) {
    const g = 24 + Math.random() * 70;
    ctx.fillStyle = `rgba(${g},${g},${g + 3},${0.1 + Math.random() * 0.22})`;
    const s = 0.6 + Math.random() * 2.4;
    ctx.fillRect(Math.random() * size, Math.random() * size, s, s * (0.4 + Math.random()));
  }
  // Light gray chips / quartz
  for (let i = 0; i < 4000; i++) {
    const g = 75 + Math.random() * 55;
    ctx.fillStyle = `rgba(${g},${g},${g},${0.08 + Math.random() * 0.14})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  // Tire scuffs
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(8,8,10,${0.12 + Math.random() * 0.18})`;
    ctx.lineWidth = 2 + Math.random() * 4;
    ctx.beginPath();
    const x0 = Math.random() * size;
    const y0 = Math.random() * size;
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(
      x0 + (Math.random() - 0.5) * 180,
      y0 + (Math.random() - 0.5) * 40,
      x0 + (Math.random() - 0.5) * 220,
      y0 + (Math.random() - 0.5) * 60
    );
    ctx.stroke();
  }
  // Cracks
  ctx.strokeStyle = 'rgba(6,6,8,0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 36; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let j = 0; j < 10; j++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Oil / transmission stains
  for (let i = 0; i < 28; i++) {
    ctx.fillStyle = `rgba(8,8,10,${0.18 + Math.random() * 0.28})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      6 + Math.random() * 32,
      3 + Math.random() * 16,
      Math.random() * Math.PI,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  // Faded paint ghost patches
  for (let i = 0; i < 10; i++) {
    const warm = Math.random() > 0.5;
    ctx.fillStyle = warm
      ? `rgba(160,130,20,${0.04 + Math.random() * 0.06})`
      : `rgba(180,185,190,${0.03 + Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 20 + Math.random() * 80, 2 + Math.random() * 4);
  }
  const color = new THREE.CanvasTexture(c);

  const r = document.createElement('canvas');
  r.width = r.height = size;
  const rctx = r.getContext('2d');
  rctx.fillStyle = '#a0a0a0';
  rctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const v = 70 + Math.random() * 140;
    rctx.fillStyle = `rgb(${v},${v},${v})`;
    rctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  for (let i = 0; i < 80; i++) {
    const v = 30 + Math.random() * 40;
    rctx.fillStyle = `rgba(${v},${v},${v},0.6)`;
    rctx.beginPath();
    rctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      14 + Math.random() * 60,
      8 + Math.random() * 32,
      Math.random() * Math.PI,
      0,
      Math.PI * 2
    );
    rctx.fill();
  }
  const roughness = new THREE.CanvasTexture(r);
  return { color, roughness };
}

function createLotCurbs() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x8e949c, roughness: 0.9, metalness: 0.03 });
  const face = new THREE.MeshStandardMaterial({ color: 0x7a8088, roughness: 0.88, metalness: 0.04 });
  const hw = LOT_W / 2;
  const hd = LOT_D / 2;
  const mk = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), mat);
    m.position.set(x, 0.07, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    // Chamfer lip — reads as poured curb, not a toy block
    const lip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.995, 0.06, d * 0.995), face);
    lip.position.set(x, 0.17, z);
    lip.receiveShadow = true;
    g.add(lip);
  };
  mk(LOT_W + 1.2, 0.55, 0, -hd - 0.12);
  mk(LOT_W + 1.2, 0.55, 0, hd + 0.12);
  mk(0.55, LOT_D, -hw - 0.12, 0);
  mk(0.55, LOT_D, hw + 0.12, 0);

  // Sidewalk / BFR curb along store front
  const storeFront = planToWorld(1024, 640);
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xa6adb6, roughness: 0.92, metalness: 0.02 });
  const walk = new THREE.Mesh(new THREE.BoxGeometry(58, 0.12, 5.4), walkMat);
  walk.position.set(storeFront.x, 0.06, storeFront.z);
  walk.receiveShadow = true;
  walk.castShadow = true;
  g.add(walk);
  const walkCurb = new THREE.Mesh(
    new THREE.BoxGeometry(58, 0.16, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x90969e, roughness: 0.88 })
  );
  walkCurb.position.set(storeFront.x, 0.08, storeFront.z + 2.55);
  g.add(walkCurb);

  // Weathered yellow fire-lane curb face (paint, not neon)
  const fireY = planToWorld((FIRE_LANE.x0 + FIRE_LANE.x1) / 2, FIRE_LANE.y);
  const fireLen = (FIRE_LANE.x1 - FIRE_LANE.x0) * SCALE;
  const fireCurb = new THREE.Mesh(
    new THREE.BoxGeometry(fireLen, 0.14, 0.26),
    new THREE.MeshStandardMaterial({
      color: 0xd4a910,
      roughness: 0.75,
      metalness: 0.02,
      emissive: 0x000000,
      emissiveIntensity: 0,
    })
  );
  fireCurb.position.set(fireY.x, 0.09, fireY.z - 1.8);
  g.add(fireCurb);

  return g;
}

function createIslands() {
  const g = new THREE.Group();
  const concrete = new THREE.MeshStandardMaterial({
    color: 0x969ca5,
    roughness: 0.92,
    metalness: 0.02,
  });
  const curbPaint = new THREE.MeshStandardMaterial({
    color: 0xc9a20f,
    roughness: 0.8,
    metalness: 0.02,
  });
  const mulch = new THREE.MeshStandardMaterial({
    color: 0x3a2c20,
    roughness: 0.97,
  });
  const green = new THREE.MeshStandardMaterial({
    color: 0x456f44,
    roughness: 0.9,
  });

  for (const isl of ISLANDS) {
    const w = planToWorld(isl.x, isl.y);
    const ww = isl.w * SCALE;
    const dd = isl.h * SCALE;
    const rotY = isl.rot ? -isl.rot + Math.PI / 2 : 0;

    const pad = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.16, dd), concrete);
    pad.position.set(w.x, 0.09, w.z);
    pad.rotation.y = rotY;
    pad.castShadow = true;
    pad.receiveShadow = true;
    g.add(pad);

    // Painted curb nose (common on real lots)
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.2, ww * 0.98), 0.08, 0.12),
      curbPaint
    );
    nose.position.set(w.x, 0.14, w.z);
    nose.rotation.y = rotY;
    // Offset along local Z of island
    nose.translateZ(dd * 0.48);
    g.add(nose);

    const dirt = new THREE.Mesh(
      new THREE.BoxGeometry(ww * 0.7, 0.07, dd * 0.62),
      Math.random() > 0.4 ? mulch : green
    );
    dirt.position.set(w.x, 0.19, w.z);
    dirt.rotation.y = rotY;
    dirt.receiveShadow = true;
    g.add(dirt);

    // Occasional small shrub volume
    if (Math.random() > 0.55) {
      const bush = new THREE.Mesh(
        new THREE.SphereGeometry(Math.min(ww, dd) * 0.22, 10, 8),
        green
      );
      bush.position.set(w.x, 0.32, w.z);
      bush.scale.y = 0.7;
      bush.castShadow = true;
      g.add(bush);
    }
  }
  return g;
}

function createStore() {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({
    color: 0xd8dce2,
    roughness: 0.78,
    metalness: 0.05,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x2c5282,
    roughness: 0.55,
    metalness: 0.15,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x7ec8e8,
    roughness: 0.15,
    metalness: 0.4,
    transparent: true,
    opacity: 0.55,
  });

  const main = BUILDINGS.find((b) => b.kind === 'store');
  const c = planToWorld(main.x + main.w / 2, main.y + main.h / 2);
  const bw = main.w * SCALE;
  const bd = main.h * SCALE;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bw, 9.5, bd), wall);
  body.position.set(c.x, 4.75, c.z);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const band = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.2, 1.4, 0.4), accent);
  band.position.set(c.x, 7.2, c.z + bd / 2 + 0.1);
  g.add(band);

  // Vestibule glass at GR / GM
  for (const v of VESTIBULES) {
    const vw = planToWorld(v.x, v.y);
    const vest = new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.2, 3.0), glass);
    vest.position.set(vw.x, 2.2, vw.z);
    vest.castShadow = true;
    g.add(vest);
  }

  const letterMat = new THREE.MeshStandardMaterial({
    color: 0x1a365d,
    roughness: 0.4,
    metalness: 0.2,
    emissive: 0x0a1628,
    emissiveIntensity: 0.2,
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 0.25), letterMat);
  sign.position.set(c.x, 8.6, c.z + bd / 2 + 0.15);
  g.add(sign);

  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(42, 0.25, 5),
    new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.6, metalness: 0.3 })
  );
  canopy.position.set(c.x, 4.5, c.z + bd / 2 + 1.5);
  canopy.castShadow = true;
  g.add(canopy);

  // Storefront window bays — breaks the flat toy-box facade
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x6aa8c4,
    roughness: 0.18,
    metalness: 0.35,
    transparent: true,
    opacity: 0.65,
  });
  const mullion = new THREE.MeshStandardMaterial({ color: 0x5a6574, roughness: 0.55, metalness: 0.25 });
  for (let i = -4; i <= 4; i++) {
    const wx = c.x + i * 5.2;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, 0.12), winMat);
    pane.position.set(wx, 2.4, c.z + bd / 2 + 0.06);
    g.add(pane);
    const mull = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.4, 0.16), mullion);
    mull.position.set(wx + 2.2, 2.4, c.z + bd / 2 + 0.08);
    g.add(mull);
  }

  const acc = BUILDINGS.find((b) => b.kind === 'acc');
  if (acc) {
    const ac = planToWorld(acc.x + acc.w / 2, acc.y + acc.h / 2);
    const am = new THREE.Mesh(
      new THREE.BoxGeometry(acc.w * SCALE, 6, acc.h * SCALE),
      wall
    );
    am.position.set(ac.x, 3, ac.z);
    am.castShadow = true;
    g.add(am);
  }

  const garden = BUILDINGS.find((b) => b.kind === 'garden');
  if (garden) {
    const gc = planToWorld(garden.x + garden.w / 2, garden.y + garden.h / 2);
    const fence = new THREE.Mesh(
      new THREE.BoxGeometry(garden.w * SCALE, 2.2, garden.h * SCALE),
      new THREE.MeshStandardMaterial({
        color: 0x6b7280,
        roughness: 0.7,
        transparent: true,
        opacity: 0.45,
      })
    );
    fence.position.set(gc.x, 1.1, gc.z);
    g.add(fence);
  }

  return g;
}

function createPad(x, z, w, d, h) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: 0xc5cad1, roughness: 0.85 })
  );
  m.position.set(x, h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return g;
}

function createLightPole(x, z) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    roughness: 0.45,
    metalness: 0.7,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.35, 12), metal);
  base.position.set(x, 0.18, z);
  base.castShadow = true;
  g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 9.5, 10), metal);
  pole.position.set(x, 5.0, z);
  pole.castShadow = true;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), metal);
  arm.position.set(x + 0.7, 9.5, z);
  g.add(arm);
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.18, 0.4),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xfff3d0,
      emissiveIntensity: 0.25,
      roughness: 0.3,
    })
  );
  lamp.position.set(x + 1.5, 9.35, z);
  g.add(lamp);
  if (Math.abs(x) + Math.abs(z) < 55) {
    const pl = new THREE.PointLight(0xfff0d0, 0.22, 22, 2);
    pl.position.set(x + 1.5, 9.1, z);
    g.add(pl);
  }
  return g;
}

function createCartCorral(x, z) {
  const g = new THREE.Group();
  const rail = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6, roughness: 0.4 });
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.1, 1.4),
    new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      metalness: 0.55,
      roughness: 0.45,
      transparent: true,
      opacity: 0.35,
    })
  );
  frame.position.set(x, 0.55, z);
  frame.castShadow = true;
  g.add(frame);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.06), rail);
  bar.position.set(x, 1.05, z - 0.65);
  g.add(bar);
  return g;
}

function createHaze() {
  const count = 180;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * LOT_W * 1.1;
    pos[i * 3 + 1] = 0.5 + Math.random() * 8;
    pos[i * 3 + 2] = (Math.random() - 0.5) * LOT_D * 1.1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xd8e0ea,
    size: 0.35,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

/** Ghost guide lines in world as thin meshes (mission active guides). */
export function createGuideMeshes(guides, activeIndex = 0) {
  const group = new THREE.Group();
  group.name = 'guides';
  const mats = {
    white: new THREE.MeshStandardMaterial({
      color: 0xe8ecf0,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      roughness: 0.9,
    }),
    yellow: new THREE.MeshStandardMaterial({
      color: 0xd4a914,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      roughness: 0.9,
    }),
    blue: new THREE.MeshStandardMaterial({
      color: 0x2b6cb0,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      roughness: 0.9,
    }),
  };
  guides.forEach((g, i) => {
    const a = planToWorld(g.a.x, g.a.y);
    const b = planToWorld(g.b.x, g.b.y);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 0.01;
    const width = Math.max(0.08, g.width * SCALE * 0.55);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.015, len),
      (mats[g.color] || mats.yellow).clone()
    );
    mesh.material.opacity = i === activeIndex ? 0.48 : 0.16;
    mesh.position.set((a.x + b.x) / 2, 0.04, (a.z + b.z) / 2);
    mesh.rotation.y = Math.atan2(dx, dz);
    mesh.userData.guideIndex = i;
    group.add(mesh);
  });
  return group;
}

export function setActiveGuideMesh(group, activeIndex) {
  if (!group) return;
  group.children.forEach((m, i) => {
    if (m.material) m.material.opacity = i === activeIndex ? 0.5 : 0.16;
  });
}
