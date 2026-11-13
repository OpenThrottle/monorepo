import { describe, expect, it } from 'vitest';

import { bootstrapCi, mulberry32 } from '../bootstrap.ts';

// Reference values below were computed independently with Python's stdlib
// (math.erfc, math.comb, statistics.NormalDist().inv_cdf) unless a hand derivation is noted.

describe('mulberry32', () => {
  it('repeats for the same seed and differs across seeds', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const first = [a(), a(), a()];

    expect(first).toEqual([b(), b(), b()]);
    expect(mulberry32(43)()).not.toBe(first[0]);
  });

  it('is uniform on [0, 1)', () => {
    const random = mulberry32(7);
    const draws = Array.from({ length: 20000 }, () => {
      return random();
    });
    const average = draws.reduce((sum, value) => sum + value, 0) / draws.length;

    expect(Math.min(...draws)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...draws)).toBeLessThan(1);
    // Mean of U(0,1) is 0.5 with standard error sqrt(1/12/20000) = 0.002.
    expect(Math.abs(average - 0.5)).toBeLessThan(0.01);
  });
});

describe('bootstrapCi', () => {
  const half = [...Array(50).fill(1), ...Array(50).fill(0)];

  it('returns the same interval for the same seed', () => {
    expect(bootstrapCi(half, { seed: 5 })).toEqual(
      bootstrapCi(half, { seed: 5 }),
    );
    // Continuous values, so a different seed moves the percentiles.
    const spread = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    expect(bootstrapCi(spread, { seed: 5 })).not.toEqual(
      bootstrapCi(spread, { seed: 6 }),
    );
  });

  it('matches the normal-theory interval for 50 of 100', () => {
    const ci = bootstrapCi(half, { seed: 1 });

    // Analytic SE = sqrt(0.5 * 0.5 / 100) = 0.05, so 0.5 +/- 1.96 * 0.05 = [0.402, 0.598].
    expect(ci?.mean).toBe(0.5);
    expect(ci?.lower).toBeCloseTo(0.402, 1);
    expect(ci?.upper).toBeCloseTo(0.598, 1);
    expect(Math.abs((ci?.lower ?? 0) - 0.402)).toBeLessThan(0.015);
    expect(Math.abs((ci?.upper ?? 0) - 0.598)).toBeLessThan(0.015);
  });

  it('collapses for a constant sample and rejects bad input', () => {
    expect(bootstrapCi([1, 1, 1, 1], { resamples: 200 })).toMatchObject({
      lower: 1,
      upper: 1,
    });
    expect(bootstrapCi([])).toBeNull();
    expect(bootstrapCi([1], { confidence: 1 })).toBeNull();
  });
});
