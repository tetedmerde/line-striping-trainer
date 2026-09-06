/**
 * Missions for Supercenter #2855 front field (Shawnee KS plan).
 * Angled stalls, ADA near vestibules, SECP crosswalks, fire-lane, arrows.
 * HOOKERS paint crew copy — PG-13 rowdy, no NSFW.
 */

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

/** ~60° angled stall geometry helpers */
const ANGLE = (60 * Math.PI) / 180;
const SW = 2.85;
const SD = 5.6;

export const MISSIONS = [
  {
    id: 1,
    title: 'Angled Stall Lines (Yellow)',
    description: 'HOOKERS crew specialty — laser-lock 4" yellow across angled bays in front of the store.',
    brief: 'Aim laser at the far-bay target box → L to LOCK → Space for a clean yellow 4" coat across the angled stalls.',
    tips: [
      'Workflow: T place/cycle target → line up green laser → L lock → drive + Space spray.',
      'Locked path holds heading for multi-bay straight lines. Freehand is advanced/hard mode.',
      'G toggles laser · V top-down · Shift crawl · 1/2/3 paint. Yellow scores here.',
    ],
    allowedColors: ['yellow'],
    spawn: { x: -24, z: 10, rot: -ANGLE },
    rects: [
      ...makeAngledStallBay(-34, 2, 11, 'yellow'),
      ...makeAngledStallBay(-34, 18, 11, 'yellow'),
    ],
    polys: [],
  },
  {
    id: 2,
    title: 'ADA Near Vestibules',
    description: 'Blue accessible stalls up front by GR/GM — borders, hashes, symbol pads.',
    brief: 'Blue near the doors. Lock laser on the target for borders, then hashes and pads. Wrong color still paints — it tanks your score.',
    tips: [
      '1 White · 2 Yellow · 3 Blue — always live. Mission wants BLUE.',
      'Laser lock for straight borders; unlock (L) for short hash work if you need freehand.',
      'T cycles target box across guides. V top-down helps line up the tip.',
    ],
    allowedColors: ['blue'],
    spawn: { x: -6, z: 4, rot: Math.PI / 2 },
    rects: [
      { x: -12, z: -12, w: 0.22, d: SD, color: 'blue', type: 'ada-border' },
      { x: -12 + SW * 3.4, z: -12, w: 0.22, d: SD, color: 'blue', type: 'ada-border' },
      { x: -12, z: -12, w: SW * 3.4, d: 0.22, color: 'blue', type: 'ada-border' },
      { x: -12, z: -12 + SD - 0.22, w: SW * 3.4, d: 0.22, color: 'blue', type: 'ada-border' },
      { x: -12 + SW * 1.15, z: -12, w: 0.22, d: SD, color: 'blue', type: 'ada-border' },
      { x: -12 + SW * 2.3, z: -12, w: 0.22, d: SD, color: 'blue', type: 'ada-border' },
      { x: -11.1, z: -9.6, w: 1.5, d: 2.4, color: 'blue', type: 'ada-symbol' },
      { x: -6.6, z: -9.6, w: 1.5, d: 2.4, color: 'blue', type: 'ada-symbol' },
      { x: -9.0, z: -11.2, w: 0.28, d: 4.2, color: 'blue', type: 'aisle' },
      { x: -8.4, z: -11.2, w: 0.28, d: 4.2, color: 'blue', type: 'aisle' },
      { x: -7.8, z: -11.2, w: 0.28, d: 4.2, color: 'blue', type: 'aisle' },
    ],
    polys: [],
  },
  {
    id: 3,
    title: 'SECP · Stop Bars · Fire Lane',
    description: 'Store-entrance crosswalk, 12" stop bars, arrows on the BFR, yellow fire-lane curb.',
    brief: 'White stop bar + SECP. Yellow arrows & fire-lane. Lock the laser for long runs — that’s how real stripers keep a good coat.',
    tips: [
      'Long fire-lane: target at far end → laser on box → L lock → cruise + spray.',
      'Colors 1/2/3 always live. Scoring cares what’s on the asphalt.',
      'Hard steer breaks lock. G laser · T target · L lock · Space spray.',
    ],
    allowedColors: ['white', 'yellow'],
    spawn: { x: 4, z: 22, rot: Math.PI },
    rects: [
      { x: -8, z: 2.5, w: 16, d: 0.38, color: 'white', type: 'stop-bar' },
      ...makeCrosswalk(-7, -26, 0.7, 2.8, 1.4, 8, 'white'),
      { x: -50, z: -29.2, w: 100, d: 0.2, color: 'yellow', type: 'fire-lane' },
      { x: 30, z: 6, w: 2.5, d: 0.12, color: 'yellow', type: 'island' },
      { x: 30, z: 6.65, w: 2.5, d: 0.12, color: 'yellow', type: 'island' },
      { x: 30, z: 7.3, w: 2.5, d: 0.12, color: 'yellow', type: 'island' },
      { x: 30, z: 7.95, w: 2.5, d: 0.12, color: 'yellow', type: 'island' },
      { x: 30, z: 8.6, w: 2.5, d: 0.12, color: 'yellow', type: 'island' },
    ],
    polys: [
      {
        color: 'yellow',
        width: 0.42,
        type: 'arrow',
        points: [
          { x: -4, z: 14 },
          { x: -4, z: 8.5 },
        ],
      },
      {
        color: 'yellow',
        width: 0.42,
        type: 'arrow-head',
        points: [
          { x: -5.2, z: 10 },
          { x: -4, z: 8.5 },
          { x: -2.8, z: 10 },
        ],
      },
      {
        color: 'yellow',
        width: 0.5,
        type: 'arrow',
        points: [
          { x: 4, z: 14 },
          { x: 4, z: 8.5 },
        ],
      },
      {
        color: 'yellow',
        width: 0.5,
        type: 'arrow-head',
        points: [
          { x: 2.7, z: 10.1 },
          { x: 4, z: 8.5 },
          { x: 5.3, z: 10.1 },
        ],
      },
    ],
  },
];

function makeAngledStallBay(startX, startZ, count, color) {
  const rects = [];
  const rot = -ANGLE;
  for (let i = 0; i <= count; i++) {
    // Center-based rotated dividers
    const cx = startX + i * SW * Math.cos(ANGLE * 0.15);
    const cz = startZ + i * (SW * 0.55);
    rects.push({
      x: cx,
      z: cz,
      w: 0.14,
      d: SD,
      color,
      type: 'stall',
      rot,
    });
  }
  return rects;
}

function makeCrosswalk(startX, startZ, barW, barD, gap, count, color) {
  const rects = [];
  for (let i = 0; i < count; i++) {
    rects.push({
      x: startX + i * (barW + gap),
      z: startZ,
      w: barW,
      d: barD,
      color,
      type: 'crosswalk',
    });
  }
  return rects;
}

export function getMission(id) {
  return MISSIONS.find((m) => m.id === id) ?? MISSIONS[0];
}
