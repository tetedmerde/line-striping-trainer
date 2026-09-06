/** Mission guides in plan-image pixel space (2048×1822) — geometry from #2855 lotLayout. */

import { STALL_BANKS, expandStallBank, ADA_ZONES, STOP_CROSSWALK, FIRE_LANE } from './lotLayout.js';

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

function adaGuides(zone, prefix) {
  const { x0, y0, x1, y1 } = zone;
  const mid = (x0 + x1) / 2;
  const out = [
    g(`${prefix}-l`, 'blue', x0, y0, x0, y1, 5, 'border'),
    g(`${prefix}-r`, 'blue', x1, y0, x1, y1, 5, 'border'),
    g(`${prefix}-t`, 'blue', x0, y0, x1, y0, 5, 'border'),
    g(`${prefix}-b`, 'blue', x0, y1, x1, y1, 5, 'border'),
    g(`${prefix}-m`, 'blue', mid, y0, mid, y1, 4, 'divider'),
  ];
  for (let i = 0; i < 3; i++) {
    const t = 0.25 + i * 0.2;
    const x = x0 + (x1 - x0) * t;
    out.push(g(`${prefix}-h${i}`, 'blue', x - 5, y0 + 12, x + 8, y1 - 12, 4, 'hash'));
  }
  return out;
}

export const MISSIONS = [
  {
    id: 1,
    title: '1 · Angled Stall Lines',
    brief:
      'LAYOUT: Hookers crew puts AutoLayout pre-mark dots on angled yellow stalls. STRIPE: aim LazerGuide through dots → L lock → Space coat. Y skips layout.',
    allowedColors: ['yellow'],
    spawn: { x: 520, y: 1050, rot: -0.95 },
    view: { x: 720, y: 1120, zoom: 1.55 },
    guides: [
      ...expandStallBank(STALL_BANKS[0]),
      ...expandStallBank(STALL_BANKS[1]),
    ],
  },
  {
    id: 2,
    title: '2 · ADA Near Vestibules',
    brief:
      'Crew dots the blue ADA borders & hashes by GR/GM doors. Connect dots with BLUE (3). Y skips layout → stripe.',
    allowedColors: ['blue'],
    spawn: { x: 780, y: 780, rot: Math.PI / 2 },
    view: { x: 940, y: 760, zoom: 1.85 },
    guides: [...adaGuides(ADA_ZONES[0], 'ada-gr'), ...adaGuides(ADA_ZONES[1], 'ada-gm')],
  },
  {
    id: 3,
    title: '3 · Stop · SECP · Fire Lane',
    brief:
      'Dots on white stop/crosswalk + yellow fire-lane & arrows. Layout then stripe. Helper still walks the target box.',
    allowedColors: ['white', 'yellow'],
    spawn: { x: 980, y: 980, rot: Math.PI },
    view: { x: 1000, y: 900, zoom: 1.45 },
    guides: [
      g(
        'stop',
        'white',
        STOP_CROSSWALK.stopX0,
        STOP_CROSSWALK.stopY,
        STOP_CROSSWALK.stopX1,
        STOP_CROSSWALK.stopY,
        10,
        'stop-bar'
      ),
      ...STOP_CROSSWALK.cwXs.map((x, i) =>
        g(`cw${i}`, 'white', x, STOP_CROSSWALK.cwY0, x, STOP_CROSSWALK.cwY1, 8, 'crosswalk')
      ),
      g('fire', 'yellow', FIRE_LANE.x0, FIRE_LANE.y, FIRE_LANE.x1, FIRE_LANE.y, 5, 'fire-lane'),
      g('arr1', 'yellow', 920, 1000, 920, 920, 6, 'arrow'),
      g('arr2', 'yellow', 1080, 1000, 1080, 920, 6, 'arrow'),
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
