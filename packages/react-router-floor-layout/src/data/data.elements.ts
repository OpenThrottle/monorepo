/**
 * Hardcoded element catalog — default real-world dimensions (inches), default
 * seat counts, and z-order layer per element type. Lives in `data/` (not in
 * components) per repo conventions. UI copy for the palette lives here too.
 */

import { FloorElementType, FloorLayer } from '../types';

/**
 * Default geometry + seat count for a freshly created element of a given type.
 *
 * @public
 */
export interface ElementDefaults {
  readonly height: number;
  readonly seats: number;
  readonly width: number;
}

/**
 * Z-order layer for each element type. Zones sit behind walls, which sit behind
 * tables/stools, so background regions never steal pointer hits.
 *
 * @public
 */
export const ELEMENT_LAYER: Readonly<Record<FloorElementType, FloorLayer>> = {
  [FloorElementType.STOOL]: FloorLayer.SEATING,
  [FloorElementType.TABLE_RECTANGLE]: FloorLayer.SEATING,
  [FloorElementType.TABLE_ROUND]: FloorLayer.SEATING,
  [FloorElementType.TABLE_SQUARE]: FloorLayer.SEATING,
  [FloorElementType.WALL]: FloorLayer.WALL,
  [FloorElementType.ZONE]: FloorLayer.ZONE,
};

/**
 * Default real-world dimensions (inches) and seat counts per element type.
 * Real restaurant defaults: a 2-top square is 24x24in; stools/chairs are 18in.
 *
 * @public
 */
export const ELEMENT_DEFAULTS: Readonly<
  Record<FloorElementType, ElementDefaults>
> = {
  [FloorElementType.STOOL]: { height: 18, seats: 0, width: 18 },
  [FloorElementType.TABLE_RECTANGLE]: { height: 30, seats: 4, width: 48 },
  [FloorElementType.TABLE_ROUND]: { height: 36, seats: 4, width: 36 },
  [FloorElementType.TABLE_SQUARE]: { height: 24, seats: 2, width: 24 },
  [FloorElementType.WALL]: { height: 4, seats: 0, width: 48 },
  [FloorElementType.ZONE]: { height: 120, seats: 0, width: 120 },
};

/**
 * A palette entry: a placeable element type plus its display copy.
 *
 * @public
 */
export interface PaletteItem {
  readonly label: string;
  readonly type: FloorElementType;
}

/**
 * Ordered palette catalog (labels + copy) shown to the user. Tables first, then
 * stool, then structural zone/wall.
 *
 * @public
 */
export const PALETTE_ITEMS: readonly PaletteItem[] = [
  { label: 'Round table', type: FloorElementType.TABLE_ROUND },
  { label: 'Square table', type: FloorElementType.TABLE_SQUARE },
  { label: 'Rectangle table', type: FloorElementType.TABLE_RECTANGLE },
  { label: 'Stool', type: FloorElementType.STOOL },
  { label: 'Zone', type: FloorElementType.ZONE },
  { label: 'Wall', type: FloorElementType.WALL },
];
