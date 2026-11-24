/**
 * @description Narrows an unknown JSON value to a plain object (not an array, not null).
 */
export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};
