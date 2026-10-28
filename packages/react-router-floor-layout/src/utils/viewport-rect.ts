/**
 * DOM helpers for `useViewport` — read the on-screen rectangle of the `<svg>`
 * and find its center. Kept out of `utils/viewport` (pure math, no DOM).
 */

import { type Point } from './geometry';
import { type ViewportRect } from './viewport';

/**
 * The on-screen rectangle of an SVG element, or `null` when it is not mounted.
 */
export function rectOf(svg: SVGSVGElement | null): ViewportRect | null {
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  return { height: r.height, left: r.left, top: r.top, width: r.width };
}

/** The client-space center point of a viewport rectangle. */
export function pointerCenter(rect: ViewportRect): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
