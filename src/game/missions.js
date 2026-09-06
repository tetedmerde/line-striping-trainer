/**
 * Mission definitions inspired by Supercenter restriping work packages
 * (BFR/OCR lot, ADA near entrances, SECP crosswalk, arrows/stop bars).
 * World: X right, Y up, Z toward storefront (negative Z = building side).
 * NO trademarked brand marks — generic STORE branding only.
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

const SW = 2.75;
const SD = 5.5;

export const MISSIONS = [
  {
    id: 1,
    title: 'Stall Lines (4" White)',
    description: 'Restripe white stall dividers in the main customer bay (GC restriping package).',
    brief: 'Paint 4" white stall lines in the front bay. Keep the boom on the ghosts — overspray kills your score.',
    tips: [
      'WASD drive · Space / LMB spray · White (1).',
      'Work one stall line at a time along the bay.',
      'BFR is the drive lane between the building and the stalls — stay clear when not painting.',
    ],
    allowedColors: ['white'],
    spawn: { x: -22, z: 6, rot: 0 },
    rects: [
      ...makeStallDividers(-30, -6, SW, SD, 12, 'white'),
      ...makeStallDividers(-30, 12, SW, SD, 12, 'white'),
    ],
    polys: [],
  },
  {
    id: 2,
    title: 'Accessible / Van ADA',
    description: 'Blue accessible stalls near the entrance — borders, access aisle hashes, ISA pads (van-accessible).',
    brief: 'Paint blue ADA bay borders, access-aisle hashes, and symbol pads. Van-accessible aisle is the hashed lane.',
    tips: [
      'Blue paint only (3).',
      'Trace borders first, then hashes, then fill symbol pads.',
      'Do not paint white stalls nearby — wrong-color / overspray penalties apply.',
    ],
    allowedColors: ['blue'],
    spawn: { x: -8, z: 2, rot: Math.PI / 2 },
    rects: [
      { x: -10, z: -6, w: 0.2, d: SD, color: 'blue', type: 'ada-border' },
      { x: -10 + SW * 3.2, z: -6, w: 0.2, d: SD, color: 'blue', type: 'ada-border' },
      { x: -10, z: -6, w: SW * 3.2, d: 0.2, color: 'blue', type: 'ada-border' },
      { x: -10, z: -6 + SD - 0.2, w: SW * 3.2, d: 0.2, color: 'blue', type: 'ada-border' },
      { x: -10 + SW * 1.1, z: -6, w: 0.2, d: SD, color: 'blue', type: 'ada-border' },
      { x: -10 + SW * 2.2, z: -6, w: 0.2, d: SD, color: 'blue', type: 'ada-border' },
      { x: -9.2, z: -3.8, w: 1.5, d: 2.4, color: 'blue', type: 'ada-symbol' },
      { x: -5.0, z: -3.8, w: 1.5, d: 2.4, color: 'blue', type: 'ada-symbol' },
      { x: -7.15, z: -5.4, w: 0.28, d: 4.2, color: 'blue', type: 'aisle' },
      { x: -6.55, z: -5.4, w: 0.28, d: 4.2, color: 'blue', type: 'aisle' },
      { x: -5.95, z: -5.4, w: 0.28, d: 4.2, color: 'blue', type: 'aisle' },
    ],
    polys: [],
  },
  {
    id: 3,
    title: 'SECP Crosswalk · Stop Bars · Arrows',
    description: 'Store-entrance crosswalk, 12" stop bars, open/solid arrows on the BFR — plus fire-lane yellow curb touch-up.',
    brief: 'White for stop bar + SECP crosswalk. Yellow for open arrows and 6" fire-lane striping along the BFR curb.',
    tips: [
      'White (1): stop bar + crosswalk bars.',
      'Yellow (2): lane arrows + fire-lane curb stripe.',
      'Match guide color exactly — wrong color is a hard penalty.',
    ],
    allowedColors: ['white', 'yellow'],
    spawn: { x: 2, z: 20, rot: Math.PI },
    rects: [
      { x: -7, z: 3.2, w: 14, d: 0.35, color: 'white', type: 'stop-bar' },
      ...makeCrosswalk(-6.5, -24.5, 0.65, 2.6, 1.35, 8, 'white'),
      { x: -40, z: -28.15, w: 80, d: 0.18, color: 'yellow', type: 'fire-lane' },
      { x: 18, z: 8, w: 2.4, d: 0.12, color: 'yellow', type: 'island' },
      { x: 18, z: 8.6, w: 2.4, d: 0.12, color: 'yellow', type: 'island' },
      { x: 18, z: 9.2, w: 2.4, d: 0.12, color: 'yellow', type: 'island' },
      { x: 18, z: 9.8, w: 2.4, d: 0.12, color: 'yellow', type: 'island' },
      { x: 18, z: 10.4, w: 2.4, d: 0.12, color: 'yellow', type: 'island' },
    ],
    polys: [
      {
        color: 'yellow',
        width: 0.4,
        type: 'arrow',
        points: [
          { x: -3.5, z: 12 },
          { x: -3.5, z: 7.2 },
        ],
      },
      {
        color: 'yellow',
        width: 0.4,
        type: 'arrow-head',
        points: [
          { x: -4.6, z: 8.6 },
          { x: -3.5, z: 7.2 },
          { x: -2.4, z: 8.6 },
        ],
      },
      {
        color: 'yellow',
        width: 0.5,
        type: 'arrow',
        points: [
          { x: 3.5, z: 12 },
          { x: 3.5, z: 7.2 },
        ],
      },
      {
        color: 'yellow',
        width: 0.5,
        type: 'arrow-head',
        points: [
          { x: 2.3, z: 8.7 },
          { x: 3.5, z: 7.2 },
          { x: 4.7, z: 8.7 },
        ],
      },
    ],
  },
];

function makeStallDividers(startX, startZ, spacing, depth, count, color) {
  const rects = [];
  for (let i = 0; i <= count; i++) {
    rects.push({
      x: startX + i * spacing,
      z: startZ,
      w: 0.12,
      d: depth,
      color,
      type: 'stall',
    });
  }
  rects.push({
    x: startX,
    z: startZ,
    w: count * spacing + 0.12,
    d: 0.12,
    color,
    type: 'stall-edge',
  });
  rects.push({
    x: startX,
    z: startZ + depth - 0.12,
    w: count * spacing + 0.12,
    d: 0.12,
    color,
    type: 'stall-edge',
  });
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
