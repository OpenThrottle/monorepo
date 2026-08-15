/**
 * @description Narrow an `unknown` value to a plain object (`Record<string,
 * unknown>`), excluding `null` and arrays. The type-predicate replacement for
 * `value as Record<string, unknown>` when reading dynamic/JSON-ish shapes in
 * services and UI code. Returns `false` for `null`, arrays, primitives, and
 * functions.
 *
 * @public
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
