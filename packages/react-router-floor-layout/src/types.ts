/**
 * Floor-layout model — zod is the single source of truth.
 *
 * Runtime validation schemas live here; the static TypeScript types are derived
 * from them via `z.infer` so the two can never drift. All world coordinates and
 * dimensions are canonical **inches**; `displayUnit` only changes labels.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Const enumerations (no TypeScript enums — as-const objects per repo style)
// ---------------------------------------------------------------------------

/**
 * The kinds of element that can be placed on a floor.
 *
 * @publicApi
 */
export const FloorElementType = {
  STOOL: 'stool',
  TABLE_RECTANGLE: 'table-rectangle',
  TABLE_ROUND: 'table-round',
  TABLE_SQUARE: 'table-square',
  WALL: 'wall',
  ZONE: 'zone',
} as const;

/**
 * A single placeable element kind.
 *
 * @publicApi
 */
export type FloorElementType =
  (typeof FloorElementType)[keyof typeof FloorElementType];

/**
 * Label units. The model always stores inches; this only affects how
 * dimensions are rendered to the user.
 *
 * @publicApi
 */
export const DisplayUnit = {
  CM: 'cm',
  FT_IN: 'ft-in',
  M: 'm',
} as const;

/**
 * A supported display unit for dimension labels.
 *
 * @publicApi
 */
export type DisplayUnit = (typeof DisplayUnit)[keyof typeof DisplayUnit];

/**
 * Render + hit-test z-order. Lower draws first (further back). Zones sit behind
 * everything so they never steal pointer hits from tables/stools on top.
 *
 * @publicApi
 */
export const FloorLayer = {
  SEATING: 2,
  WALL: 1,
  ZONE: 0,
} as const;

/**
 * A z-order layer value.
 *
 * @publicApi
 */
export type FloorLayer = (typeof FloorLayer)[keyof typeof FloorLayer];

/**
 * The only `schemaVersion` this build understands. Bump + branch in `fromJSON`
 * when a breaking model migration lands.
 *
 * @publicApi
 */
export const FLOOR_LAYOUT_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Element schemas (discriminated on `type` for exact, cast-free narrowing)
// ---------------------------------------------------------------------------

const baseElementShape = {
  /** World-space height in inches. */
  height: z.number().positive(),
  id: z.string().min(1),
  /** Optional free-text label rendered on the element. */
  label: z.string().optional(),
  /** Z-order layer; see {@link FloorLayer}. */
  layer: z.number().int(),
  /** Clockwise rotation in degrees about the element center. */
  rotation: z.number(),
  /** World-space width in inches. */
  width: z.number().positive(),
  /** Center X in world inches. */
  x: z.number(),
  /** Center Y in world inches. */
  y: z.number(),
};

const seatingShape = {
  ...baseElementShape,
  /** Number of seats auto-rendered around the table perimeter. */
  seats: z.number().int().min(0),
};

const tableRectangleSchema = z.object({
  ...seatingShape,
  type: z.literal(FloorElementType.TABLE_RECTANGLE),
});

const tableRoundSchema = z.object({
  ...seatingShape,
  type: z.literal(FloorElementType.TABLE_ROUND),
});

const tableSquareSchema = z.object({
  ...seatingShape,
  type: z.literal(FloorElementType.TABLE_SQUARE),
});

const stoolSchema = z.object({
  ...baseElementShape,
  type: z.literal(FloorElementType.STOOL),
});

const wallSchema = z.object({
  ...baseElementShape,
  type: z.literal(FloorElementType.WALL),
});

const zoneSchema = z.object({
  ...baseElementShape,
  /** Zones always carry a label (the region name). */
  label: z.string(),
  type: z.literal(FloorElementType.ZONE),
});

/**
 * A single element on the floor. Discriminated on `type`: tables carry `seats`,
 * zones carry a required `label`, walls/stools are minimal.
 *
 * @publicApi
 */
export const floorElementSchema = z.discriminatedUnion('type', [
  stoolSchema,
  tableRectangleSchema,
  tableRoundSchema,
  tableSquareSchema,
  wallSchema,
  zoneSchema,
]);

/**
 * A whole floor layout. JSON-serializable; carries `schemaVersion` for future
 * migrations. Floor `width`/`height` and `gridSize` are in inches.
 *
 * @publicApi
 */
export const floorLayoutSchema = z.object({
  displayUnit: z.enum([DisplayUnit.CM, DisplayUnit.FT_IN, DisplayUnit.M]),
  elements: z.array(floorElementSchema),
  /** Snap-grid spacing in inches (default 12 = one foot). */
  gridSize: z.number().positive(),
  /** Floor height in inches. */
  height: z.number().positive(),
  id: z.string().min(1),
  name: z.string(),
  schemaVersion: z.literal(FLOOR_LAYOUT_SCHEMA_VERSION),
  /** Floor width in inches. */
  width: z.number().positive(),
});

// ---------------------------------------------------------------------------
// Derived static types (z.infer — never hand-written, never drift)
// ---------------------------------------------------------------------------

/**
 * A single floor element.
 *
 * @publicApi
 */
export type FloorElement = z.infer<typeof floorElementSchema>;

/**
 * A whole serializable floor layout.
 *
 * @publicApi
 */
export type FloorLayout = z.infer<typeof floorLayoutSchema>;

/**
 * A table element (any of round/square/rectangle) — the variants that carry
 * `seats`.
 *
 * @publicApi
 */
export type TableElement = Extract<FloorElement, { seats: number }>;
