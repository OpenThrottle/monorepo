import { describe, expect, it } from 'vitest';

import { erfc, normalQuantile } from '../normal.ts';

// Reference values below were computed independently with Python's stdlib
// (math.erfc, math.comb, statistics.NormalDist().inv_cdf) unless a hand derivation is noted.

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
