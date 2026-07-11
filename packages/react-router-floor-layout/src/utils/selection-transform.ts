/**
 * Pure resize/rotate math for the selection handles. Extracted from
 * `SelectionHandles` so the trickiest geometry in the package — local-frame
 * un-rotation for resize and angle normalization for rotate — is unit-testable
 * without jsdom pointer plumbing. No React, no DOM.
 */

import {
  type Point,
  angleBetween,
  rotatePoint,
  snapValueToGrid,
} from './geometry';

/** Smallest size (inches) a resize handle can produce. */
export const MIN_SIZE = 6;

/** Rotation snap step (degrees) when snapping is enabled. */
export const ROTATE_SNAP_DEGREES = 15;

/**
 * A patch produced by dragging a selection handle.
 *
 * @public
 */
export type SelectionTransform = Partial<{
  readonly height: number;
  readonly rotation: number;
  readonly width: number;
}>;

/**
 * The element geometry the resize/rotate math needs: center (`x`, `y`) plus the
 * current `rotation` (degrees, clockwise in SVG's y-down space).
 *
 * @public
 */
export interface SelectionAnchor {
  readonly rotation: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Compute a `{ width, height }` patch from the resize-handle pointer position.
 *
 * The pointer is un-rotated into the element's local frame so resizing stays
 * intuitive at any rotation, then the half-extent on each axis is doubled to a
 * full size, optionally grid-snapped, and floored at {@link MIN_SIZE}.
 *
 * @public
 */
export function computeSize(
  anchor: SelectionAnchor,
  pointer: Point,
  gridSize: number,
  snapEnabled: boolean,
): SelectionTransform {
  const local = rotatePoint(
    { x: pointer.x - anchor.x, y: pointer.y - anchor.y },
    -anchor.rotation,
  );
  const rawW = Math.abs(local.x) * 2;
  const rawH = Math.abs(local.y) * 2;
  const snappedW = snapEnabled ? snapValueToGrid(rawW, gridSize) : rawW;
  const snappedH = snapEnabled ? snapValueToGrid(rawH, gridSize) : rawH;
  return {
    height: Math.max(MIN_SIZE, snappedH),
    width: Math.max(MIN_SIZE, snappedW),
  };
}

/**
 * Compute a `{ rotation }` patch from the rotate-handle pointer position.
 *
 * The angle from the element center to the pointer is offset by 90° (the
 * rotate handle sits above the top edge), normalized into `[0, 360)`, and
 * optionally snapped to {@link ROTATE_SNAP_DEGREES}.
 *
 * @public
 */
export function computeRotation(
  anchor: SelectionAnchor,
  pointer: Point,
  snapEnabled: boolean,
): SelectionTransform {
  const raw = angleBetween({ x: anchor.x, y: anchor.y }, pointer) + 90;
  const normalized = ((raw % 360) + 360) % 360;
  return {
    rotation: snapEnabled
      ? snapValueToGrid(normalized, ROTATE_SNAP_DEGREES)
      : normalized,
  };
}
