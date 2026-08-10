import { describe, expect, it } from 'vitest';
import type {
  LoadAverageMetrics,
  PsiCpuMetrics,
  SystemCpuMetrics,
  SystemCpuSnapshot,
} from '../../types/metrics.js';
import {
  captureLoadAverage,
  createEmptyPsiMetrics,
  determinePressureLevel,
  formatSystemCpuMetrics,
  toLoadAverageMetrics,
} from '../metrics.js';

const loadAverage = (
  perCoreLoad1m: number,
  overrides: Partial<LoadAverageMetrics> = {},
): LoadAverageMetrics => ({
  cpuCount: 8,
  load15m: 1,
  load1m: 1,
  load5m: 1,
  perCoreLoad1m,
  ...overrides,
});

const psi = (some10s: number | null): PsiCpuMetrics => ({
  ...createEmptyPsiMetrics(),
  some10s,
});

describe('toLoadAverageMetrics', () => {
  it('rounds load averages to 2 decimals and derives per-core from the raw 1m load', () => {
    expect(toLoadAverageMetrics([8.456, 4.123, 2.789], 4)).toEqual({
      cpuCount: 4,
      load15m: 2.79,
      load1m: 8.46,
      load5m: 4.12,
      // Math.round((8.456 / 4) * 100) / 100
      perCoreLoad1m: 2.11,
    });
  });

  it('does not recompute per-core from the already-rounded load1m', () => {
    // Rounded load1m is 1.01 → 1.01/2 = 0.505, but per-core must stay 0.5
    // from the raw 1.006/2 (comparing those two was the brittle host assertion).
    const result = toLoadAverageMetrics([1.006, 1, 1], 2);

    expect(result.load1m).toBe(1.01);
    expect(result.perCoreLoad1m).toBe(0.5);
  });

  it('falls back to the raw 1m load when cpuCount is 0', () => {
    expect(toLoadAverageMetrics([1.234, 1, 1], 0).perCoreLoad1m).toBe(1.234);
  });
});

describe('captureLoadAverage', () => {
  it('returns a finite snapshot for the host', () => {
    const result = captureLoadAverage();

    expect(result.cpuCount).toBeGreaterThan(0);
    expect(Number.isFinite(result.load1m)).toBe(true);
    expect(Number.isFinite(result.load5m)).toBe(true);
    expect(Number.isFinite(result.load15m)).toBe(true);
    expect(Number.isFinite(result.perCoreLoad1m)).toBe(true);
  });
});

describe('determinePressureLevel', () => {
  describe('per-core load boundaries (PSI null)', () => {
    it('treats 0.69 per-core as low (below the 0.7 moderate threshold)', () => {
      expect(determinePressureLevel(loadAverage(0.69), psi(null))).toBe('low');
    });

    it('treats exactly 0.7 per-core as moderate (inclusive lower bound)', () => {
      expect(determinePressureLevel(loadAverage(0.7), psi(null))).toBe(
        'moderate',
      );
    });

    it('treats exactly 1.5 per-core as moderate (inclusive upper bound)', () => {
      expect(determinePressureLevel(loadAverage(1.5), psi(null))).toBe(
        'moderate',
      );
    });

    it('treats 1.51 per-core as high (above the 1.5 threshold)', () => {
      expect(determinePressureLevel(loadAverage(1.51), psi(null))).toBe('high');
    });
  });

  describe('PSI some10s boundaries (low per-core load)', () => {
    it('is low when PSI is null and load is low', () => {
      expect(determinePressureLevel(loadAverage(0.1), psi(null))).toBe('low');
    });

    it('is moderate when PSI some10s is exactly 5 (inclusive lower bound)', () => {
      expect(determinePressureLevel(loadAverage(0.1), psi(5))).toBe('moderate');
    });

    it('is high when PSI some10s is 21 (above the 20 threshold)', () => {
      expect(determinePressureLevel(loadAverage(0.1), psi(21))).toBe('high');
    });
  });

  it('returns unknown for a non-finite per-core load', () => {
    expect(determinePressureLevel(loadAverage(Number.NaN), psi(null))).toBe(
      'unknown',
    );
    expect(
      determinePressureLevel(loadAverage(Number.POSITIVE_INFINITY), psi(null)),
    ).toBe('unknown');
  });
});

describe('formatSystemCpuMetrics', () => {
  const snapshot = (
    psiMetrics: PsiCpuMetrics,
    load: LoadAverageMetrics,
  ): SystemCpuSnapshot => ({
    loadAverage: load,
    psi: psiMetrics,
    timestamp: 0,
  });

  const metrics = (
    overrides: Partial<SystemCpuMetrics> = {},
  ): SystemCpuMetrics => ({
    atEnd: snapshot(createEmptyPsiMetrics(), loadAverage(0.5)),
    atStart: snapshot(createEmptyPsiMetrics(), loadAverage(0.5)),
    platform: 'darwin',
    pressureLevel: 'low',
    psiAvailable: false,
    psiFullDeltaUs: null,
    psiSomeDeltaUs: null,
    ...overrides,
  });

  it('summarizes load, per-core load, cpu count, and pressure level', () => {
    const summary = formatSystemCpuMetrics(metrics());

    expect(summary).toContain('System CPU: load 1');
    expect(summary).toContain('0.5/core on 8 cores');
    expect(summary).toContain('pressure: low');
  });

  it('appends PSI some10s only when PSI is available and present', () => {
    const summary = formatSystemCpuMetrics(
      metrics({
        atEnd: snapshot(psi(12), loadAverage(0.5)),
        platform: 'linux',
        psiAvailable: true,
      }),
    );

    expect(summary).toContain('PSI some10s: 12%');
  });

  it('omits the PSI segment when PSI is unavailable', () => {
    const summary = formatSystemCpuMetrics(metrics());

    expect(summary).not.toContain('PSI some10s');
  });

  it('appends a stall delta in milliseconds when psiSomeDeltaUs is positive', () => {
    const summary = formatSystemCpuMetrics(metrics({ psiSomeDeltaUs: 2500 }));

    expect(summary).toContain('stall delta: 2.5ms');
  });

  it('omits the stall delta when psiSomeDeltaUs is null or non-positive', () => {
    expect(formatSystemCpuMetrics(metrics())).not.toContain('stall delta');
    expect(
      formatSystemCpuMetrics(metrics({ psiSomeDeltaUs: 0 })),
    ).not.toContain('stall delta');
  });

  it('notes when PSI is unavailable on a non-linux platform', () => {
    const summary = formatSystemCpuMetrics(metrics({ platform: 'darwin' }));

    expect(summary).toContain('PSI unavailable on darwin');
  });
});
