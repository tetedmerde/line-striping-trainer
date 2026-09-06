/** Plan-image pixels <-> world meters (Y-up, XZ ground). */
export const PLAN_W = 2048;
export const PLAN_H = 1822;
/** meters per plan pixel — #2855 sheet maps to ~102m x 91m playable lot */
export const SCALE = 0.05;

export function planToWorld(px, py) {
  return {
    x: (px - PLAN_W * 0.5) * SCALE,
    z: (py - PLAN_H * 0.5) * SCALE,
  };
}

export function worldToPlan(x, z) {
  return {
    x: x / SCALE + PLAN_W * 0.5,
    y: z / SCALE + PLAN_H * 0.5,
  };
}

export function planLenToMeters(lenPx) {
  return lenPx * SCALE;
}
