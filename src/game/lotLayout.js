/**
 * Supercenter #2855 lot geometry in plan-pixel space (2048×1822).
 * Derived from site plan SP-1: angled stalls, BFR, ADA near vestibules,
 * EV bank, cart corrals, islands, fire lane, stop/crosswalk zones.
 * Building is generic STORE — no trademarks.
 */


/** ~60° angled stalls (plan radians; matches field layout). */
export const STALL_ANGLE = -0.95;

/** Stall depth in plan px (~18'). */
export const STALL_DEPTH = 100;

/** Typical stall width along bay (~9'). */
export const STALL_PITCH = 42;

/**
 * Building footprint (plan rects) — north / top of sheet.
 * @type {{x:number,y:number,w:number,h:number,kind:string}[]}
 */
export const BUILDINGS = [
  { x: 620, y: 180, w: 780, h: 420, kind: 'store' }, // main box
  { x: 1380, y: 280, w: 220, h: 280, kind: 'acc' }, // ACC wing
  { x: 1280, y: 200, w: 160, h: 160, kind: 'garden' },
];

/** Vestibule centers (plan). */
export const VESTIBULES = [
  { id: 'gr', x: 860, y: 620, label: 'GR' },
  { id: 'gm', x: 1120, y: 620, label: 'GM' },
];

/**
 * Landscaped / concrete islands (raised pads).
 * @type {{x:number,y:number,w:number,h:number,rot?:number}[]}
 */
export const ISLANDS = [
  // Front of store / BFR separators
  { x: 720, y: 680, w: 70, h: 28 },
  { x: 960, y: 680, w: 90, h: 28 },
  { x: 1200, y: 680, w: 70, h: 28 },
  // End-of-row islands — front angled field
  { x: 520, y: 980, w: 36, h: 55, rot: STALL_ANGLE },
  { x: 940, y: 1220, w: 36, h: 55, rot: STALL_ANGLE },
  { x: 460, y: 1100, w: 36, h: 55, rot: STALL_ANGLE },
  { x: 880, y: 1340, w: 36, h: 55, rot: STALL_ANGLE },
  { x: 560, y: 1280, w: 36, h: 55, rot: STALL_ANGLE },
  { x: 980, y: 1480, w: 36, h: 55, rot: STALL_ANGLE },
  // Mid aisle islands
  { x: 700, y: 1150, w: 40, h: 50, rot: STALL_ANGLE },
  { x: 820, y: 1280, w: 40, h: 50, rot: STALL_ANGLE },
  { x: 640, y: 1400, w: 40, h: 50, rot: STALL_ANGLE },
  { x: 1080, y: 1100, w: 40, h: 48 },
  { x: 1180, y: 1280, w: 40, h: 48 },
  // EV bank islands (west)
  { x: 280, y: 1120, w: 32, h: 70 },
  { x: 280, y: 1320, w: 32, h: 70 },
  // East field
  { x: 1320, y: 1000, w: 40, h: 55 },
  { x: 1420, y: 1180, w: 40, h: 55 },
];

/** Cart corrals (plan centers). */
export const CART_CORRALS = [
  [650, 1200],
  [850, 1250],
  [1050, 1180],
  [700, 1350],
  [920, 1400],
  [780, 1100],
];

/** Light pole bases (plan). */
export const LIGHT_POLES = [
  [480, 900],
  [720, 900],
  [960, 900],
  [1200, 900],
  [480, 1100],
  [720, 1100],
  [960, 1100],
  [1200, 1100],
  [480, 1300],
  [720, 1300],
  [960, 1300],
  [1200, 1300],
  [600, 750],
  [900, 750],
  [1100, 750],
  [550, 1450],
  [850, 1450],
  [1150, 1450],
  [350, 1200],
  [1400, 1100],
];

/**
 * Stall bay definitions — each bank is a back-to-back angled row.
 * start/end = bay spine in plan; count = stall dividers.
 */
export const STALL_BANKS = [
  {
    id: 'front-a',
    color: 'yellow',
    x0: 540,
    y0: 980,
    x1: 900,
    y1: 1200,
    count: 9,
    depth: STALL_DEPTH,
    angle: STALL_ANGLE,
  },
  {
    id: 'front-b',
    color: 'yellow',
    x0: 480,
    y0: 1100,
    x1: 840,
    y1: 1320,
    count: 9,
    depth: STALL_DEPTH,
    angle: STALL_ANGLE,
  },
  {
    id: 'mid-a',
    color: 'yellow',
    x0: 520,
    y0: 1240,
    x1: 880,
    y1: 1460,
    count: 8,
    depth: STALL_DEPTH,
    angle: STALL_ANGLE,
  },
  {
    id: 'east-a',
    color: 'yellow',
    x0: 1080,
    y0: 980,
    x1: 1380,
    y1: 980,
    count: 7,
    depth: 95,
    angle: Math.PI / 2,
  },
  {
    id: 'ev-west',
    color: 'white',
    x0: 220,
    y0: 1080,
    x1: 220,
    y1: 1380,
    count: 6,
    depth: 90,
    angle: 0,
  },
];

/** BFR / fire-lane curb path (plan polyline samples). */
export const FIRE_LANE = {
  y: 655,
  x0: 680,
  x1: 1360,
};

/** Stop bar / SECP crosswalk zone in front of vestibules. */
export const STOP_CROSSWALK = {
  stopY: 860,
  stopX0: 780,
  stopX1: 1220,
  cwY0: 780,
  cwY1: 850,
  cwXs: [820, 860, 900, 940, 980, 1020, 1060, 1100, 1140],
};

/** ADA boxes near GR / GM vestibules. */
export const ADA_ZONES = [
  { x0: 800, y0: 700, x1: 920, y1: 820 }, // GR
  { x0: 1040, y0: 700, x1: 1160, y1: 820 }, // GM
];

export function expandStallBank(bank) {
  const guides = [];
  const { x0, y0, x1, y1, count, depth, angle, color, id } = bank;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const ax = x0 + (x1 - x0) * t;
    const ay = y0 + (y1 - y0) * t;
    const dx = Math.cos(angle) * depth;
    const dy = Math.sin(angle) * depth;
    guides.push({
      id: `${id}-${i}`,
      color,
      width: 4,
      a: { x: ax - dx * 0.08, y: ay - dy * 0.08 },
      b: { x: ax + dx * 0.92, y: ay + dy * 0.92 },
      label: 'stall',
      bankId: id,
    });
  }
  return guides;
}

/** All permanent lot stripe guides (for world paint / debug). */
export function buildLotGuides() {
  const out = [];
  for (const bank of STALL_BANKS) {
    out.push(...expandStallBank(bank));
  }
  // Fire lane
  out.push({
    id: 'fire-lane',
    color: 'yellow',
    width: 6,
    a: { x: FIRE_LANE.x0, y: FIRE_LANE.y },
    b: { x: FIRE_LANE.x1, y: FIRE_LANE.y },
    label: 'fire-lane',
  });
  // Stop bar
  out.push({
    id: 'stop-bar',
    color: 'white',
    width: 12,
    a: { x: STOP_CROSSWALK.stopX0, y: STOP_CROSSWALK.stopY },
    b: { x: STOP_CROSSWALK.stopX1, y: STOP_CROSSWALK.stopY },
    label: 'stop-bar',
  });
  // Crosswalk ticks
  for (let i = 0; i < STOP_CROSSWALK.cwXs.length; i++) {
    const x = STOP_CROSSWALK.cwXs[i];
    out.push({
      id: `cw-${i}`,
      color: 'white',
      width: 8,
      a: { x, y: STOP_CROSSWALK.cwY0 },
      b: { x, y: STOP_CROSSWALK.cwY1 },
      label: 'crosswalk',
    });
  }
  // ADA borders
  for (let zi = 0; zi < ADA_ZONES.length; zi++) {
    const z = ADA_ZONES[zi];
    const prefix = `ada${zi}`;
    out.push(
      { id: `${prefix}-l`, color: 'blue', width: 5, a: { x: z.x0, y: z.y0 }, b: { x: z.x0, y: z.y1 }, label: 'ada' },
      { id: `${prefix}-r`, color: 'blue', width: 5, a: { x: z.x1, y: z.y0 }, b: { x: z.x1, y: z.y1 }, label: 'ada' },
      { id: `${prefix}-t`, color: 'blue', width: 5, a: { x: z.x0, y: z.y0 }, b: { x: z.x1, y: z.y0 }, label: 'ada' },
      { id: `${prefix}-b`, color: 'blue', width: 5, a: { x: z.x0, y: z.y1 }, b: { x: z.x1, y: z.y1 }, label: 'ada' }
    );
    const mid = (z.x0 + z.x1) / 2;
    out.push({
      id: `${prefix}-m`,
      color: 'blue',
      width: 4,
      a: { x: mid, y: z.y0 },
      b: { x: mid, y: z.y1 },
      label: 'ada-hash',
    });
  }
  return out;
}

