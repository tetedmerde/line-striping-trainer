/**
 * Mission definitions for the line striping trainer.
 * Guides are axis-aligned or simple polylines in lot coordinates (0–1000 x 0–700).
 */

export const COLORS = {
  white: '#f5f5f5',
  yellow: '#facc15',
  blue: '#2563eb',
};

export const PASS_THRESHOLD = 70;

/** @typedef {{ x: number, y: number, w: number, h: number, color: string, type?: string }} GuideRect */
/** @typedef {{ points: {x:number,y:number}[], color: string, width: number, type?: string }} GuidePoly */

/**
 * @typedef {Object} Mission
 * @property {number} id
 * @property {string} title
 * @property {string} description
 * @property {string} brief
 * @property {string[]} tips
 * @property {string[]} allowedColors
 * @property {GuideRect[]} rects
 * @property {GuidePoly[]} polys
 * @property {boolean} showStorefront
 * @property {boolean} showAdaSymbols
 */

/** @type {Mission[]} */
export const MISSIONS = [
  {
    id: 1,
    title: 'Stall Lines',
    description: 'Paint white stall divider lines in the main parking bay.',
    brief: 'Paint all white stall lines. Stay on the guides; avoid overspray.',
    tips: [
      'Hold mouse to paint along each guide.',
      'Use White paint (1).',
      'Cover the full length of each stall line.',
    ],
    allowedColors: ['white'],
    showStorefront: true,
    showAdaSymbols: false,
    rects: [
      // Vertical stall dividers — front row (facing store)
      ...makeStallDividers(80, 180, 12, 140, 10, 'white'),
      // Back row
      ...makeStallDividers(80, 420, 12, 140, 10, 'white'),
    ],
    polys: [],
  },
  {
    id: 2,
    title: 'ADA / Handicap Stalls',
    description: 'Mark designated accessible stalls with blue lines and symbols.',
    brief: 'Paint blue stall borders and accessibility symbols in marked bays.',
    tips: [
      'Switch to Blue paint (3).',
      'Trace blue borders, then fill the symbol areas.',
      'White stall lines nearby are already complete — do not repaint them.',
    ],
    allowedColors: ['blue'],
    showStorefront: true,
    showAdaSymbols: true,
    rects: [
      // ADA bay borders (left two stalls of front row)
      { x: 80, y: 180, w: 6, h: 140, color: 'blue', type: 'ada-border' },
      { x: 80 + 12 * 10, y: 180, w: 6, h: 140, color: 'blue', type: 'ada-border' },
      { x: 80, y: 180, w: 12 * 10 + 6, h: 6, color: 'blue', type: 'ada-border' },
      { x: 80, y: 180 + 134, w: 12 * 10 + 6, h: 6, color: 'blue', type: 'ada-border' },
      // Center divider between two ADA stalls
      { x: 80 + 12 * 5, y: 180, w: 6, h: 140, color: 'blue', type: 'ada-border' },
      // Symbol blocks (approximate ISA-style rectangles + access aisle stripe)
      { x: 100, y: 230, w: 36, h: 50, color: 'blue', type: 'ada-symbol' },
      { x: 160, y: 230, w: 36, h: 50, color: 'blue', type: 'ada-symbol' },
      // Access aisle hash marks
      { x: 118, y: 200, w: 8, h: 100, color: 'blue', type: 'aisle' },
      { x: 134, y: 200, w: 8, h: 100, color: 'blue', type: 'aisle' },
      { x: 150, y: 200, w: 8, h: 100, color: 'blue', type: 'aisle' },
    ],
    polys: [],
  },
  {
    id: 3,
    title: 'Arrows, Stop Bars & Crosswalk',
    description: 'Add traffic control markings near the storefront entrance lane.',
    brief: 'Paint yellow arrows, a white stop bar, and crosswalk bars at the entrance.',
    tips: [
      'White (1) for stop bar and crosswalk.',
      'Yellow (2) for lane arrows.',
      'Follow each guide carefully — wrong color counts against you.',
    ],
    allowedColors: ['white', 'yellow'],
    showStorefront: true,
    showAdaSymbols: false,
    rects: [
      // Stop bar across drive lane
      { x: 280, y: 340, w: 200, h: 14, color: 'white', type: 'stop-bar' },
      // Crosswalk bars
      { x: 300, y: 120, w: 18, h: 48, color: 'white', type: 'crosswalk' },
      { x: 330, y: 120, w: 18, h: 48, color: 'white', type: 'crosswalk' },
      { x: 360, y: 120, w: 18, h: 48, color: 'white', type: 'crosswalk' },
      { x: 390, y: 120, w: 18, h: 48, color: 'white', type: 'crosswalk' },
      { x: 420, y: 120, w: 18, h: 48, color: 'white', type: 'crosswalk' },
      { x: 450, y: 120, w: 18, h: 48, color: 'white', type: 'crosswalk' },
    ],
    polys: [
      // Directional arrows (yellow) — simple chevron/arrow heads as thick polys
      {
        color: 'yellow',
        width: 14,
        type: 'arrow',
        points: [
          { x: 360, y: 380 },
          { x: 360, y: 450 },
        ],
      },
      {
        color: 'yellow',
        width: 14,
        type: 'arrow-head',
        points: [
          { x: 340, y: 400 },
          { x: 360, y: 380 },
          { x: 380, y: 400 },
        ],
      },
      {
        color: 'yellow',
        width: 14,
        type: 'arrow',
        points: [
          { x: 520, y: 380 },
          { x: 520, y: 450 },
        ],
      },
      {
        color: 'yellow',
        width: 14,
        type: 'arrow-head',
        points: [
          { x: 500, y: 400 },
          { x: 520, y: 380 },
          { x: 540, y: 400 },
        ],
      },
    ],
  },
];

function makeStallDividers(startX, startY, spacing, height, count, color) {
  const rects = [];
  for (let i = 0; i <= count; i++) {
    rects.push({
      x: startX + i * spacing * 5,
      y: startY,
      w: 5,
      h: height,
      color,
      type: 'stall',
    });
  }
  // Front edge line of the bay
  rects.push({
    x: startX,
    y: startY,
    w: count * spacing * 5 + 5,
    h: 5,
    color,
    type: 'stall-edge',
  });
  rects.push({
    x: startX,
    y: startY + height - 5,
    w: count * spacing * 5 + 5,
    h: 5,
    color,
    type: 'stall-edge',
  });
  return rects;
}

export function getMission(id) {
  return MISSIONS.find((m) => m.id === id) ?? MISSIONS[0];
}
