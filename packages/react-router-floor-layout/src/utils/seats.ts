/**
 * Pure seat-glyph placement (hybrid seating model): a table's `seats` count is
 * auto-distributed around its perimeter by shape — no manual chair placement.
 * Positions are world coords in the element's UNROTATED frame; the element's
 * `rotation` transform (applied by the view) rotates the chairs with the table.
 */

import { type Point } from './geometry';
import { FloorElementType, type TableElement } from '../types';

/** Default gap (inches) from the table edge to a chair-glyph center. */
const DEFAULT_SEAT_OFFSET = 10;

/**
 * Distribute `seats` chair positions around a table. Round tables space chairs
 * evenly on a circle; square/rectangle tables walk the perimeter so longer
 * sides naturally get more chairs.
 *
 * @publicApi
 */
export function seatPositions(
  table: Pick<TableElement, 'height' | 'seats' | 'type' | 'width' | 'x' | 'y'>,
  offset: number = DEFAULT_SEAT_OFFSET,
): readonly Point[] {
  const { height, seats, type, width, x, y } = table;
  if (seats <= 0) return [];

  if (type === FloorElementType.TABLE_ROUND) {
    const radius = Math.max(width, height) / 2 + offset;
    return Array.from({ length: seats }, (_unused, index) => {
      const angle = (index / seats) * Math.PI * 2 - Math.PI / 2;
      return {
        x: x + radius * Math.cos(angle),
        y: y + radius * Math.sin(angle),
      };
    });
  }

  // Rectangle/square: walk the perimeter at evenly spaced offsets, pushing each
  // chair outward along the local edge normal.
  const left = x - width / 2;
  const top = y - height / 2;
  const perimeter = (width + height) * 2;
  return Array.from({ length: seats }, (_unused, index) => {
    let d = ((index + 0.5) / seats) * perimeter;
    if (d < width) return { x: left + d, y: top - offset };
    d -= width;
    if (d < height) return { x: left + width + offset, y: top + d };
    d -= height;
    if (d < width) return { x: left + width - d, y: top + height + offset };
    d -= width;
    return { x: left - offset, y: top + height - d };
  });
}
