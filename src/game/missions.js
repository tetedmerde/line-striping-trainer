/** Mission guides in plan-image pixel space (walmart-plan-2855.jpg = 2048×1822). */

export const PLAN_W = 2048;
export const PLAN_H = 1822;

export const COLORS = {
  white: '#f2f4f7',
  yellow: '#f5c518',
  blue: '#2b6cb0',
};

export const COLOR_HEX = {
  white: 0xf2f4f7,
  yellow: 0xf5c518,
  blue: 0x2b6cb0,
};

export const PASS_THRESHOLD = 70;

/** @typedef {{ x:number, y:number }} Pt */
/** @typedef {{ id:string, color:keyof typeof COLORS, width:number, a:Pt, b:Pt, label?:string }} Guide */

function g(id, color, ax, ay, bx, by, width = 4, label = '') {
  return {
    id,
    color,
    width,
    a: { x: ax, y: ay },
    b: { x: bx, y: by },
    label,
  };
}

/** Parallel stall dividers along a bay (multi-bay laser-lock run). */
function stallBay(prefix, color, x0, y0, x1, y1, count, width = 4) {
  /** @type {Guide[]} */
  const out = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const ax = x0 + (x1 - x0) * t;
    const ay = y0 + (y1 - y0) * t;
    const ang = -0.95;
    const depth = 95;
    const dx = Math.cos(ang) * depth;
    const dy = Math.sin(ang) * depth;
    out.push(
      g(`${prefix}-${i}`, color, ax - dx * 0.15, ay - dy * 0.15, ax + dx, ay + dy, width)
    );
  }
  return out;
}

export const MISSIONS = [
  {
    id: 1,
    title: '1 · Angled Stall Lines',
    brief:
      'HOOKERS specialty — yellow 4″ stall dividers. Aim laser at helper target → L lock → Space spray. Helper walks the box down the bay as you coat.',
    allowedColors: ['yellow'],
    spawn: { x: 620, y: 1180, rot: -0.95 },
    view: { x: 720, y: 1120, zoom: 1.55 },
    guides: [
      ...stallBay('stall-a', 'yellow', 560, 1080, 900, 1280, 8),
      ...stallBay('stall-b', 'yellow', 500, 1180, 840, 1380, 8),
    ],
  },
  {
    id: 2,
    title: '2 · ADA Near Vestibules',
    brief:
      'Blue accessible borders & hashes by the doors. Mission wants BLUE (3). Lock long borders; unlock for short hashes. Helper advances the target box.',
    allowedColors: ['blue'],
    spawn: { x: 880, y: 780, rot: Math.PI / 2 },
    view: { x: 940, y: 760, zoom: 1.85 },
    guides: [
      g('ada-l', 'blue', 900, 700, 900, 820, 5, 'border'),
      g('ada-r', 'blue', 1020, 700, 1020, 820, 5, 'border'),
      g('ada-t', 'blue', 900, 700, 1020, 700, 5, 'border'),
      g('ada-b', 'blue', 900, 820, 1020, 820, 5, 'border'),
      g('ada-m1', 'blue', 940, 700, 940, 820, 4, 'divider'),
      g('ada-m2', 'blue', 980, 700, 980, 820, 4, 'divider'),
      g('ada-h1', 'blue', 955, 730, 965, 810, 4, 'hash'),
      g('ada-h2', 'blue', 970, 730, 980, 810, 4, 'hash'),
      g('ada-h3', 'blue', 945, 730, 955, 810, 4, 'hash'),
    ],
  },
  {
    id: 3,
    title: '3 · Stop · SECP · Fire Lane',
    brief:
      'White stop bar & crosswalk ticks; yellow fire-lane & arrows. Helper walks the box ahead on long runs so laser stay useful.',
    allowedColors: ['white', 'yellow'],
    spawn: { x: 980, y: 980, rot: Math.PI },
    view: { x: 1000, y: 900, zoom: 1.45 },
    guides: [
      g('stop', 'white', 820, 880, 1180, 880, 10, 'stop-bar'),
      g('cw1', 'white', 860, 820, 860, 860, 8, 'crosswalk'),
      g('cw2', 'white', 900, 820, 900, 860, 8, 'crosswalk'),
      g('cw3', 'white', 940, 820, 940, 860, 8, 'crosswalk'),
      g('cw4', 'white', 980, 820, 980, 860, 8, 'crosswalk'),
      g('cw5', 'white', 1020, 820, 1020, 860, 8, 'crosswalk'),
      g('cw6', 'white', 1060, 820, 1060, 860, 8, 'crosswalk'),
      g('fire', 'yellow', 700, 650, 1300, 650, 5, 'fire-lane'),
      g('arr1', 'yellow', 920, 980, 920, 920, 6, 'arrow'),
      g('arr2', 'yellow', 1080, 980, 1080, 920, 6, 'arrow'),
    ],
  },
];

export function getMission(id) {
  return MISSIONS.find((m) => m.id === id) ?? MISSIONS[0];
}

export function guideLength(guide) {
  const dx = guide.b.x - guide.a.x;
  const dy = guide.b.y - guide.a.y;
  return Math.hypot(dx, dy);
}

export function guideDir(guide) {
  const len = guideLength(guide) || 1;
  return {
    x: (guide.b.x - guide.a.x) / len,
    y: (guide.b.y - guide.a.y) / len,
  };
}

/** Project point onto infinite guide line; return {t, dist, point}. */
export function projectOnGuide(guide, p) {
  const dx = guide.b.x - guide.a.x;
  const dy = guide.b.y - guide.a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = ((p.x - guide.a.x) * dx + (p.y - guide.a.y) * dy) / len2;
  const point = { x: guide.a.x + dx * t, y: guide.a.y + dy * t };
  const dist = Math.hypot(p.x - point.x, p.y - point.y);
  return { t, dist, point };
}

/** Point along guide at parameter t (0..1). */
export function pointOnGuide(guide, t) {
  return {
    x: guide.a.x + (guide.b.x - guide.a.x) * t,
    y: guide.a.y + (guide.b.y - guide.a.y) * t,
  };
}
