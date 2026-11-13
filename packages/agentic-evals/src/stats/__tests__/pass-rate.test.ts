import { describe, expect, it } from 'vitest';

import { costPerSuccess, passAtK, passHatK, passRate } from '../pass-rate.ts';

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
