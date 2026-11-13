import { describe, expect, it } from 'vitest';

import { bootstrapCi } from '../bootstrap-ci.ts';
import { costPerSuccess } from '../costPerSuccess.ts';
import { erfc, normalQuantile } from '../normal.ts';
import { passAtK, passHatK } from '../pass-at-k.ts';
import { passRate } from '../passRate.ts';
import { mulberry32 } from '../prng.ts';

// Reference values below were computed independently with Python's stdlib
// (math.erfc, math.comb, statistics.NormalDist().inv_cdf) unless a hand derivation is noted.

describe('passRate', () => {
  it('excludes error and usage_limited and reports n', () => {
    const result = passRate([
      { kind: 'pass' },
      { kind: 'pass' },
      { kind: 'fail' },
      { kind: 'error' },
      { kind: 'usage_limited' },
    ]);

    // 2 passes of 3 gradable; 2 excluded.
    expect(result).toEqual({ excluded: 2, n: 3, passes: 2, rate: 2 / 3 });
  });

  it('has no rate when nothing is gradable', () => {
    expect(passRate([{ kind: 'error' }]).rate).toBeNull();
    expect(passRate([]).rate).toBeNull();
  });
});

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

describe('passAtK and passHatK', () => {
  it('computes pass@k = 1 - C(n-c,k)/C(n,k)', () => {
    // n=5,c=1,k=2: 1 - C(4,2)/C(5,2) = 1 - 6/10 = 0.4 (hand).
    expect(passAtK(5, 1, 2)).toBeCloseTo(0.4, 12);
    // n=10,c=3,k=3: 1 - C(7,3)/C(10,3) = 1 - 35/120 = 0.708333... (math.comb).
    expect(passAtK(10, 3, 3)).toBeCloseTo(0.7083333333333333, 12);
    // pass@1 is the plain pass fraction c/n.
    expect(passAtK(10, 3, 1)).toBeCloseTo(0.3, 12);
  });

  it('is 1 when fewer than k attempts can fail and 0 with no passes', () => {
    expect(passAtK(5, 4, 2)).toBe(1);
    expect(passAtK(5, 0, 2)).toBe(0);
  });

  it('computes pass^k = C(c,k)/C(n,k)', () => {
    // n=4,c=3,k=2: C(3,2)/C(4,2) = 3/6 = 0.5 (hand).
    expect(passHatK(4, 3, 2)).toBeCloseTo(0.5, 12);
    expect(passHatK(4, 1, 2)).toBe(0);
    expect(passHatK(3, 3, 3)).toBe(1);
  });

  it('rejects invalid counts', () => {
    expect(passAtK(3, 1, 4)).toBeNull();
    expect(passHatK(3, 4, 1)).toBeNull();
    expect(passAtK(3, 1, 0)).toBeNull();
  });
});

describe('erfc and normalQuantile', () => {
  it('matches math.erfc across both branches', () => {
    expect(erfc(0.5)).toBeCloseTo(0.4795001221869535, 12);
    expect(erfc(1.2)).toBeCloseTo(0.08968602177036462, 12);
    expect(erfc(2)).toBeCloseTo(0.0046777349810472645, 12);
    expect(erfc(3)).toBeCloseTo(2.2090496998585438e-5, 15);
    expect(erfc(-0.5)).toBeCloseTo(2 - 0.4795001221869535, 12);
  });

  it('matches NormalDist.inv_cdf', () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.9599639845400534, 9);
    expect(normalQuantile(0.8)).toBeCloseTo(0.8416212335729144, 9);
    expect(normalQuantile(0.95)).toBeCloseTo(1.6448536269514715, 9);
    expect(normalQuantile(0.001)).toBeCloseTo(-3.090232306167813, 9);
    expect(normalQuantile(0)).toBeNull();
  });
});

describe('costPerSuccess', () => {
  it('divides total cost, failures included, by passes', () => {
    // (0.5 + 1.0 + 0.5) / 2 passes = 1.0 (hand).
    expect(
      costPerSuccess([
        { costUsd: 0.5, passed: true },
        { costUsd: 1, passed: false },
        { costUsd: 0.5, passed: true },
      ]),
    ).toBe(1);
  });

  it('is null when any trial is unpriced or nothing passed', () => {
    expect(
      costPerSuccess([
        { costUsd: null, passed: true },
        { costUsd: 1, passed: true },
      ]),
    ).toBeNull();
    expect(costPerSuccess([{ costUsd: 1, passed: false }])).toBeNull();
    expect(costPerSuccess([])).toBeNull();
  });
});
