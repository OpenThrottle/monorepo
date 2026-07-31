/**
 * Pure element helpers — layering and floor bounds. No React, no DOM.
 */

import { type Point, type Rect } from './geometry';
import { ELEMENT_DEFAULTS, ELEMENT_LAYER } from '../data/elements';
import {
  type FloorElement,
  FloorElementType,
  type FloorLayout,
} from '../types';

/**
 * The floor rectangle (world inches) an element's center is clamped to.
 *
 * @public
 */
export function floorBounds(
  layout: Pick<FloorLayout, 'height' | 'width'>,
): Rect {
  return { height: layout.height, width: layout.width, x: 0, y: 0 };
}

/**
 * Return elements ordered for painting + hit-testing: ascending `layer`
 * (zones < walls < tables/stools). Stable, so same-layer order is preserved.
 * Lower layers render first (further back); higher layers paint on top and so
 * receive pointer hits first.
 *
 * @public
 */
export function sortElementsByLayer(
  elements: readonly FloorElement[],
): readonly FloorElement[] {
  return [...elements].sort((a, b) => a.layer - b.layer);
}

/**
 * Human-readable description of an element for a11y labels/titles — the kind
 * (the `type` with dashes as spaces) plus the label when present.
 *
 * @public
 */
export function describeFloorElement(element: FloorElement): string {
  const kind = element.type.replace(/-/g, ' ');
  return element.label ? `${kind}: ${element.label}` : kind;
}

/**
 * Build a new floor element of the given type, centered at `center`, using the
 * catalog defaults (real-world inches, seat counts) and the type's z-order
 * layer. The caller supplies a stable `id`. Returns a fully-formed, schema-valid
 * element ready to commit to a layout.
 *
 * @public
 */
export function createFloorElement(params: {
  readonly center: Point;
  readonly id: string;
  readonly type: FloorElementType;
}): FloorElement {
  const { center, id, type } = params;
  const defaults = ELEMENT_DEFAULTS[type];
  const base = {
    height: defaults.height,
    id,
    layer: ELEMENT_LAYER[type],
    rotation: 0,
    width: defaults.width,
    x: center.x,
    y: center.y,
  };

  switch (type) {
    case FloorElementType.TABLE_RECTANGLE:
    case FloorElementType.TABLE_ROUND:
    case FloorElementType.TABLE_SQUARE:
      return { ...base, seats: defaults.seats, type };
    case FloorElementType.ZONE:
      return { ...base, label: 'Zone', type };
    case FloorElementType.STOOL:
    case FloorElementType.WALL:
      return { ...base, type };
  }
}
