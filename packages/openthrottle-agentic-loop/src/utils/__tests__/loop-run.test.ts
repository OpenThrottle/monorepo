import { describe, expect, it } from 'vitest';

import { clampMaxRetries } from '../loop-run.ts';

describe('clampMaxRetries', () => {
  it.each([
    [undefined, 2],
    [Number.NaN, 2],
    [-3, 0],
    [3.9, 3],
    [99, 5],
  ])('maps %s to %s', (input, expected) => {
    expect(clampMaxRetries(input)).toBe(expected);
  });
});
