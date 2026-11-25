/**
 * @description Narrow an `unknown` value to a plain object (`Record<string,
 * unknown>`), excluding `null` and arrays. The type-predicate replacement for
 * `value as Record<string, unknown>` when reading dynamic/JSON-ish shapes in
 * services and UI code. Returns `false` for `null`, arrays, primitives, and
 * functions.
 *
 * @public
 */
export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * @description Narrow an `unknown` value to an array whose every element is a
 * string. An empty array passes.
 *
 * @public
 */
export const isStringArray = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
};

/**
 * @description An `Error` carrying a string `code`, the shape Node's system
 * errors (`ENOENT`, `EADDRINUSE`, …) share with any library error that sets one.
 * Declared structurally so this package needs no `@types/node`.
 *
 * @public
 */
export interface ErrorWithCode extends Error {
  readonly code: string;
}

/**
 * @description Narrow a caught value to an {@link ErrorWithCode}, so a caller
 * can branch on `error.code === 'ENOENT'` without a cast. The runtime check is
 * universal; only Node happens to throw such errors from `fs` and `net`.
 *
 * @public
 */
export const isErrorWithCode = (error: unknown): error is ErrorWithCode => {
  return (
    error instanceof Error && 'code' in error && typeof error.code === 'string'
  );
};
