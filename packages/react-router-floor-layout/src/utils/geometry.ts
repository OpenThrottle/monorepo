/**
 * Pure world-space geometry helpers (inches). No React, no DOM — trivially
 * unit-testable. Used by the pointer-drag hook for live snap + bounds-clamp.
 */

/**
 * A world-space point in inches.
 *
 * @publicApi
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * A world-space size in inches.
 *
 * @publicApi
 */
export interface Size {
  readonly height: number;
  readonly width: number;
}

/**
 * An axis-aligned world-space rectangle in inches.
 *
 * @publicApi
 */
export interface Rect {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Snap a scalar to the nearest multiple of `grid`. A non-positive grid is a
 * no-op (snapping disabled).
 *
 * @publicApi
 */
export function snapValueToGrid(value: number, grid: number): number {
  if (grid <= 0) return value;
  return Math.round(value / grid) * grid;
}

/**
 * Snap a point to the nearest grid intersection. A non-positive grid is a
 * no-op.
 *
 * @publicApi
 */
export function snapPointToGrid(point: Point, grid: number): Point {
  return {
    x: snapValueToGrid(point.x, grid),
    y: snapValueToGrid(point.y, grid),
  };
}

/**
 * Clamp a scalar into `[min, max]`. If `min > max` (degenerate range), returns
 * `min`.
 *
 * @publicApi
 */
export function clampValue(value: number, min: number, max: number): number {
  if (min > max) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Soft bounds-clamp: keep a point (an element's center/anchor) inside the floor
 * rectangle so nothing can be dragged off-canvas and lost.
 *
 * @publicApi
 */
export function clampPointToRect(point: Point, bounds: Rect): Point {
  return {
    x: clampValue(point.x, bounds.x, bounds.x + bounds.width),
    y: clampValue(point.y, bounds.y, bounds.y + bounds.height),
  };
}

/**
 * Euclidean distance between two points.
 */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Midpoint of two points.
 *
 * @publicApi
 */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Rotate a point about the origin by `degrees` (clockwise in SVG's
 * y-down space). Pass a negative angle to un-rotate into an element's local
 * frame.
 *
 * @publicApi
 */
export function rotatePoint(point: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

/**
 * Angle in degrees (clockwise, y-down) from `from` to `to`. 0° points along +x.
 *
 * @publicApi
 */
export function angleBetween(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}
