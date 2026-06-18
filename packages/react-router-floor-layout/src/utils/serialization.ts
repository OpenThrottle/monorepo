/**
 * Lossless serialization for a {@link FloorLayout}. zod is the gatekeeper in
 * both directions: `toJSON` validates before stringifying, `fromJSON` validates
 * after parsing and throws on bad data. The `schemaVersion` literal in the
 * schema is the migration branch point — loading a different version throws.
 */

import { type FloorLayout, floorLayoutSchema } from '../types';

/**
 * Validate a layout and serialize it to a JSON string.
 *
 * @publicApi
 */
export function toJSON(layout: FloorLayout): string {
  return JSON.stringify(floorLayoutSchema.parse(layout));
}

/**
 * Parse + validate a layout from a JSON string or already-parsed value. Throws
 * (zod) on invalid data or an unsupported `schemaVersion`.
 *
 * @publicApi
 */
export function fromJSON(input: string | unknown): FloorLayout {
  const raw: unknown = typeof input === 'string' ? JSON.parse(input) : input;
  return floorLayoutSchema.parse(raw);
}
