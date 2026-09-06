import * as THREE from 'three';
import { PLAN_W, PLAN_H } from './missions.js';
import { SCALE, planToWorld } from './coords.js';

export const LOT_W = PLAN_W * SCALE;
export const LOT_D = PLAN_H * SCALE;

/**
 * Hyper-real-ish Supercenter lot: plan sheet as ground reference, PBR asphalt,
 * cinematic sun/fill/shadows, sky, curbs, light poles, generic STORE massing.
 */
export async function createWorld(scene, renderer) {
  const group = new THREE.Group();
  group.name = 'world';

  // --- Lighting ---
  scene.fog = new THREE.FogExp2(0xb8c4d4, 0.0045);

  const hemi = new THREE.HemisphereLight(0xbfd4f0, 0x3a3428, 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0dd, 2.15);
  sun.position.set(45, 62, 28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 180;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0x9eb6ff, 0.35);
  fill.position.set(-40, 25, -30);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffc9a0, 0.25);
  rim.position.set(10, 12, -50);
  scene.add(rim);

  // --- Sky dome ---
  group.add(createSky());

  // --- Ground: grass beyond lot ---
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 280),
    new THREE.MeshStandardMaterial({ color: 0x3a5a3c, roughness: 0.95, metalness: 0 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.08;
  grass.receiveShadow = true;
  group.add(grass);

  // --- Asphalt with plan albedo ---
  const planUrl = `${import.meta.env.BASE_URL}walmart-plan-2855.jpg`;
  const loader = new THREE.TextureLoader();
  const planTex = await loader.loadAsync(planUrl);
  planTex.colorSpace = THREE.SRGBColorSpace;
  planTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  planTex.wrapS = planTex.wrapT = THREE.ClampToEdgeWrapping;

  const asphaltNoise = makeAsphaltMaps(512);
  asphaltNoise.color.wrapS = asphaltNoise.color.wrapT = THREE.RepeatWrapping;
  asphaltNoise.color.repeat.set(28, 24);
  asphaltNoise.color.colorSpace = THREE.SRGBColorSpace;
  asphaltNoise.color.anisotropy = planTex.anisotropy;
  asphaltNoise.roughness.wrapS = asphaltNoise.roughness.wrapT = THREE.RepeatWrapping;
  asphaltNoise.roughness.repeat.set(28, 24);

  // Blend: dark asphalt base + plan as subtle overlay via multiply color map approach:
  // Use plan as map, tint dark, add procedural roughness for wet sheen.
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: planTex,
    color: 0x8a9098,
    roughness: 0.72,
    metalness: 0.08,
    roughnessMap: asphaltNoise.roughness,
    envMapIntensity: 0.35,
  });

  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(LOT_W, LOT_D),
    asphaltMat
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.receiveShadow = true;
  asphalt.name = 'asphalt';
  group.add(asphalt);

  // Wet sheen overlay (slightly reflective dark film)
  const sheen = new THREE.Mesh(
    new THREE.PlaneGeometry(LOT_W, LOT_D),
    new THREE.MeshStandardMaterial({
      color: 0x1a1e24,
      roughness: 0.28,
      metalness: 0.35,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    })
  );
  sheen.rotation.x = -Math.PI / 2;
  sheen.position.y = 0.01;
  sheen.receiveShadow = true;
  group.add(sheen);

  // Paint overlay mesh (canvas texture set by Game)
  const paintCanvas = document.createElement('canvas');
  paintCanvas.width = PLAN_W;
  paintCanvas.height = PLAN_H;
  const paintTex = new THREE.CanvasTexture(paintCanvas);
  paintTex.colorSpace = THREE.SRGBColorSpace;
  paintTex.anisotropy = planTex.anisotropy;
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
      emissive: 0x111111,
      emissiveIntensity: 0.08,
    })
  );
  paintMesh.rotation.x = -Math.PI / 2;
  paintMesh.position.y = 0.025;
  paintMesh.name = 'paintLayer';
  group.add(paintMesh);

  // Curbs
  group.add(createLotCurbs());

  // Store massing (generic — no logos)
  group.add(createStore());

  // Neighbor pads
  group.add(createPad(-58, -6, 16, 20, 8, 'HOME'));
  group.add(createPad(55, 16, 12, 14, 6, 'SHOPS'));

  // Light poles
  const poles = [
    [480, 900], [720, 900], [960, 900], [1200, 900],
    [480, 1100], [720, 1100], [960, 1100], [1200, 1100],
    [480, 1300], [720, 1300], [960, 1300], [1200, 1300],
    [600, 750], [900, 750], [1100, 750],
    [550, 1450], [850, 1450], [1150, 1450],
  ];
  for (const [px, py] of poles) {
    const w = planToWorld(px, py);
    group.add(createLightPole(w.x, w.z));
  }

  // Cart corrals
  for (const [px, py] of [
    [650, 1200], [850, 1250], [1050, 1180], [700, 1350],
  ]) {
    const w = planToWorld(px, py);
    group.add(createCartCorral(w.x, w.z));
  }

  // Ambient haze particles (cheap dust)
  group.add(createHaze());

  scene.add(group);
  scene.background = new THREE.Color(0x9eb6cc);

  return {
    group,
    asphalt,
    paintMesh,
    paintTex,
    sun,
    updatePaint() {
      paintTex.needsUpdate = true;
    },
  };
}

function createSky() {
  const geo = new THREE.SphereGeometry(220, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x6ea0d4) },
      midColor: { value: new THREE.Color(0xb8cce0) },
      bottomColor: { value: new THREE.Color(0xd8c8a8) },
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
        // soft sun glow
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
  ctx.fillStyle = '#3a3d42';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 6000; i++) {
    const g = 35 + Math.random() * 50;
    ctx.fillStyle = `rgba(${g},${g},${g + 6},${0.06 + Math.random() * 0.14})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2.5, 1);
  }
  // cracks
  ctx.strokeStyle = 'rgba(15,15,18,0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let j = 0; j < 7; j++) {
      x += (Math.random() - 0.5) * 50;
      y += (Math.random() - 0.5) * 50;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const color = new THREE.CanvasTexture(c);

  const r = document.createElement('canvas');
  r.width = r.height = size;
  const rctx = r.getContext('2d');
  rctx.fillStyle = '#b0b0b0';
  rctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 3000; i++) {
    const v = 90 + Math.random() * 120;
    rctx.fillStyle = `rgb(${v},${v},${v})`;
    rctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  // wetter patches (darker = smoother in roughness map)
  for (let i = 0; i < 40; i++) {
    const v = 40 + Math.random() * 40;
    rctx.fillStyle = `rgba(${v},${v},${v},0.55)`;
    rctx.beginPath();
    rctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      20 + Math.random() * 60,
      10 + Math.random() * 30,
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
  const mat = new THREE.MeshStandardMaterial({ color: 0x8b919a, roughness: 0.82, metalness: 0.05 });
  const hw = LOT_W / 2;
  const hd = LOT_D / 2;
  const mk = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), mat);
    m.position.set(x, 0.08, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  };
  mk(LOT_W + 1.2, 0.5, 0, -hd - 0.1);
  mk(LOT_W + 1.2, 0.5, 0, hd + 0.1);
  mk(0.5, LOT_D, -hw - 0.1, 0);
  mk(0.5, LOT_D, hw + 0.1, 0);

  // Sidewalk strip near store (north / -Z in our mapping ≈ top of plan)
  const storeFront = planToWorld(1024, 620);
  const walk = new THREE.Mesh(
    new THREE.BoxGeometry(55, 0.12, 4.5),
    new THREE.MeshStandardMaterial({ color: 0xa8aeb6, roughness: 0.88 })
  );
  walk.position.set(storeFront.x, 0.06, storeFront.z);
  walk.receiveShadow = true;
  g.add(walk);
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

  // Main box — sits on north portion of plan
  const c = planToWorld(1020, 420);
  const body = new THREE.Mesh(new THREE.BoxGeometry(72, 9.5, 28), wall);
  body.position.set(c.x, 4.75, c.z);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Facade band
  const band = new THREE.Mesh(new THREE.BoxGeometry(72.2, 1.4, 0.4), accent);
  band.position.set(c.x, 7.2, c.z + 14.1);
  g.add(band);

  // Vestibule glass bumps
  for (const ox of [-18, -2, 14]) {
    const vest = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 3.2), glass);
    vest.position.set(c.x + ox, 2.2, c.z + 15.5);
    vest.castShadow = true;
    g.add(vest);
  }

  // Generic STORE lettering as extruded-ish bars (no trademarks)
  const letterMat = new THREE.MeshStandardMaterial({
    color: 0x1a365d,
    roughness: 0.4,
    metalness: 0.2,
    emissive: 0x0a1628,
    emissiveIntensity: 0.2,
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 0.25), letterMat);
  sign.position.set(c.x, 8.6, c.z + 14.2);
  g.add(sign);

  // Canopy
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(40, 0.25, 5),
    new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.6, metalness: 0.3 })
  );
  canopy.position.set(c.x, 4.5, c.z + 16);
  canopy.castShadow = true;
  g.add(canopy);

  // ACC wing (east)
  const accC = planToWorld(1450, 500);
  const acc = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 16), wall);
  acc.position.set(accC.x, 3, accC.z);
  acc.castShadow = true;
  g.add(acc);

  return g;
}

function createPad(x, z, w, d, h, _label) {
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
      emissiveIntensity: 0.7,
      roughness: 0.3,
    })
  );
  lamp.position.set(x + 1.5, 9.35, z);
  g.add(lamp);
  // Cheap point light (limited count — only some poles)
  if (Math.abs(x) + Math.abs(z) < 55) {
    const pl = new THREE.PointLight(0xfff0d0, 0.55, 28, 2);
    pl.position.set(x + 1.5, 9.1, z);
    g.add(pl);
  }
  return g;
}

function createCartCorral(x, z) {
  const g = new THREE.Group();
  const rail = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6, roughness: 0.4 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.4), rail);
  frame.position.set(x, 0.55, z);
  frame.castShadow = true;
  // hollow look via scale trick — just a cage-ish box
  frame.material = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    metalness: 0.55,
    roughness: 0.45,
    wireframe: false,
    transparent: true,
    opacity: 0.35,
  });
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

/** Ghost guide lines in world as thin meshes */
export function createGuideMeshes(guides, activeIndex = 0) {
  const group = new THREE.Group();
  group.name = 'guides';
  const mats = {
    white: new THREE.MeshBasicMaterial({
      color: 0xf2f4f7,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
    yellow: new THREE.MeshBasicMaterial({
      color: 0xf5c518,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
    blue: new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
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
      new THREE.BoxGeometry(width, 0.02, len),
      (mats[g.color] || mats.yellow).clone()
    );
    mesh.material.opacity = i === activeIndex ? 0.7 : 0.28;
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
    if (m.material) m.material.opacity = i === activeIndex ? 0.72 : 0.28;
  });
}
