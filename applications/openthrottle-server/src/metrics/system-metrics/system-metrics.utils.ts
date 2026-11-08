import * as os from 'os';

import type {
  LoadAverageSnapshot,
  PressureLevel,
  PsiSnapshot,
} from './system-metrics.types.ts';

/**
 * @description Captures a LoadAverageSnapshot from os.loadavg().
 */
export function captureLoadAverage(): LoadAverageSnapshot {
  const [load1m = 0, load5m = 0, load15m = 0] = os.loadavg();
  const cpuCount = os.cpus().length;
  const perCoreLoad1m =
    cpuCount > 0 ? Math.round((load1m / cpuCount) * 100) / 100 : load1m;

  return {
    cpuCount,
    load15m: Math.round(load15m * 100) / 100,
    load1m: Math.round(load1m * 100) / 100,
    load5m: Math.round(load5m * 100) / 100,
    perCoreLoad1m,
  };
}

/**
 * @description Creates an empty PSI snapshot (all nulls).
 */
export function createEmptyPsiSnapshot(): PsiSnapshot {
  return {
    full10s: null,
    full300s: null,
    full60s: null,
    some10s: null,
    some300s: null,
    some60s: null,
  };
}

/**
 * @description Determines pressure level from load average and PSI metrics.
 */
export function determinePressureLevel(
  loadAverage: LoadAverageSnapshot,
  psi: PsiSnapshot,
): PressureLevel {
  const { perCoreLoad1m } = loadAverage;
  const psiSome = psi.some10s;

  if (perCoreLoad1m > 1.5 || (psiSome !== null && psiSome > 20)) {
    return 'high';
  }

  if (
    perCoreLoad1m >= 0.7 ||
    (psiSome !== null && psiSome >= 5 && psiSome <= 20)
  ) {
    return 'moderate';
  }

  if (perCoreLoad1m < 0.7 && (psiSome === null || psiSome < 5)) {
    return 'low';
  }

  return 'unknown';
}
