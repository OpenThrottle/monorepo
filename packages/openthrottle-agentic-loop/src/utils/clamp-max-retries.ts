import {
  DEFAULT_MAX_RETRIES,
  MAX_RETRIES_CEILING,
  MAX_RETRIES_FLOOR,
} from '../data/data.constants.ts';

/**
 * @description Resolves `maxRetries`: default 2 when absent or not finite, floored to an integer
 * and clamped to 0..5.
 * @public
 */
export const clampMaxRetries = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_MAX_RETRIES;
  }

  return Math.min(
    MAX_RETRIES_CEILING,
    Math.max(MAX_RETRIES_FLOOR, Math.floor(value)),
  );
};
