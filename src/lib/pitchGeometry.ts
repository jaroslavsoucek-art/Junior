export const PITCH_W = 100;
export const PITCH_H = 150;

/** Data coords (x 0..1 left→right, y 0..1 own goal→opponent) → SVG viewBox coords. */
export function toPitch(x: number, y: number): { cx: number; cy: number } {
  return { cx: x * PITCH_W, cy: (1 - y) * PITCH_H };
}
