/**
 * Pure SVG-viewBox math (world space = inches). No React, no DOM state — every
 * function is referentially transparent so the viewport hook stays a thin state
 * wrapper and all the tricky coordinate math is unit-testable in isolation.
 */

import {
  clampValue,
  distance,
  midpoint,
  type Point,
  type Size,
} from './geometry';

/**
 * An SVG `viewBox` expressed in world units (inches).
 *
 * @public
 */
export interface ViewBox {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

/**
 * The on-screen pixel rectangle of the `<svg>` element (a subset of
 * `DOMRect`), used to map client pixels to world coordinates.
 *
 * @public
 */
export interface ViewportRect {
  readonly height: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

/**
 * Lower/upper bounds for the viewBox width (world inches). Smaller width = more
 * zoomed in. Used to clamp every zoom operation.
 *
 * @public
 */
export interface ZoomLimits {
  readonly maxWidth: number;
  readonly minWidth: number;
}

/**
 * Serialize a viewBox to the `x y width height` string the SVG attribute wants.
 */
export function viewBoxToString(viewBox: ViewBox): string {
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
}

/**
 * Map a client (screen-pixel) point to world coordinates (inches) given the
 * SVG's on-screen rect and current viewBox.
 *
 * @public
 */
export function clientToWorld(
  client: Point,
  rect: ViewportRect,
  viewBox: ViewBox,
): Point {
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: viewBox.x, y: viewBox.y };
  }
  return {
    x: viewBox.x + ((client.x - rect.left) / rect.width) * viewBox.width,
    y: viewBox.y + ((client.y - rect.top) / rect.height) * viewBox.height,
  };
}

/**
 * Pan the viewBox by a client-pixel delta (e.g. a drag on empty canvas).
 * Dragging right moves content right, so the viewBox origin moves left.
 *
 * @public
 */
export function panViewBoxByClient(
  viewBox: ViewBox,
  clientDx: number,
  clientDy: number,
  rect: ViewportRect,
): ViewBox {
  if (rect.width <= 0 || rect.height <= 0) return viewBox;
  return {
    ...viewBox,
    x: viewBox.x - (clientDx / rect.width) * viewBox.width,
    y: viewBox.y - (clientDy / rect.height) * viewBox.height,
  };
}

/**
 * Zoom by `factor` about a fixed world focal point (the focal point stays put
 * on screen). `factor > 1` zooms in. Width is clamped to `limits`; height
 * follows the same applied scale so aspect ratio is preserved.
 *
 * @public
 */
export function zoomViewBoxAt(
  viewBox: ViewBox,
  factor: number,
  focus: Point,
  limits: ZoomLimits,
): ViewBox {
  if (factor <= 0) return viewBox;
  const targetWidth = viewBox.width / factor;
  const nextWidth = clampValue(targetWidth, limits.minWidth, limits.maxWidth);
  const appliedScale = nextWidth / viewBox.width;
  const nextHeight = viewBox.height * appliedScale;
  const focusRatioX = (focus.x - viewBox.x) / viewBox.width;
  const focusRatioY = (focus.y - viewBox.y) / viewBox.height;
  return {
    height: nextHeight,
    width: nextWidth,
    x: focus.x - focusRatioX * nextWidth,
    y: focus.y - focusRatioY * nextHeight,
  };
}

/**
 * Compute a viewBox that fits `floor` (plus world `padding` on each side)
 * centered inside a viewport of the given pixel size, matching the viewport's
 * aspect ratio so the floor is never distorted.
 *
 * @public
 */
export function fitViewBox(floor: Size, viewport: Size, padding = 0): ViewBox {
  const contentWidth = floor.width + padding * 2;
  const contentHeight = floor.height + padding * 2;
  const viewportAspect =
    viewport.width > 0 && viewport.height > 0
      ? viewport.width / viewport.height
      : contentWidth / contentHeight;
  const contentAspect = contentWidth / contentHeight;
  const width =
    contentAspect > viewportAspect
      ? contentWidth
      : contentHeight * viewportAspect;
  const height =
    contentAspect > viewportAspect
      ? contentWidth / viewportAspect
      : contentHeight;
  const centerX = floor.width / 2;
  const centerY = floor.height / 2;
  return {
    height,
    width,
    x: centerX - width / 2,
    y: centerY - height / 2,
  };
}

/**
 * Apply a two-pointer pinch step: scale by the change in pointer distance and
 * keep the gesture midpoint anchored in world space. `prev`/`next` are the two
 * pointers' client positions before and after this step.
 *
 * @public
 */
export function pinchViewBox(
  viewBox: ViewBox,
  prev: readonly [Point, Point],
  next: readonly [Point, Point],
  rect: ViewportRect,
  limits: ZoomLimits,
): ViewBox {
  const prevDist = distance(prev[0], prev[1]);
  const nextDist = distance(next[0], next[1]);
  if (prevDist <= 0 || nextDist <= 0) return viewBox;
  const factor = nextDist / prevDist;
  // Anchor on a FIXED focal point — the world point under the *previous*
  // midpoint — then pan by the full midpoint client delta so that point
  // tracks the fingers. Anchoring on the moving (next) midpoint and ALSO
  // panning double-counts the translation, sliding content faster than the
  // fingers; pick one. We anchor + pan so a pure two-finger drag still pans.
  const prevMid = midpoint(prev[0], prev[1]);
  const nextMid = midpoint(next[0], next[1]);
  const focusWorld = clientToWorld(prevMid, rect, viewBox);
  const zoomed = zoomViewBoxAt(viewBox, factor, focusWorld, limits);
  return panViewBoxByClient(
    zoomed,
    nextMid.x - prevMid.x,
    nextMid.y - prevMid.y,
    rect,
  );
}
