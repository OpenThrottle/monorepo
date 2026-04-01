import {
  METRICS_STORAGE_KEY,
  METRICS_VALID_INTERVALS,
} from '~/global/config/config.metrics';

/**
 * @description Reads persisted poll interval from localStorage; returns null if missing or invalid.
 */
export function getStoredPollIntervalMs(): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(METRICS_STORAGE_KEY);
    if (raw == null) return null;
    const n = Number(raw);

    return Number.isFinite(n) && METRICS_VALID_INTERVALS.has(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * @description Format MB values to 2 decimal places for display in stat cards.
 */
export const formatMb = (value: number): number => Number(value.toFixed(2));

/**
 * @description Format CPU ms (cumulative) for display; show integer when possible.
 */
export const formatCpuMs = (value: number): number => Number(value.toFixed(0));
