import { describe, expect, test } from 'vitest';

import { formatTimelineDuration } from '../formatters';

describe('formatTimelineDuration', () => {
  test.each([
    [0, '<1s'],
    [999, '<1s'],
    [1_000, '1s'],
    [1_999, '1s'],
    [45_000, '45s'],
    [59_999, '59s'],
    [187_000, '3m 7s'],
    [3_600_000, '1h 0m'],
    [8_040_000, '2h 14m'],
    [90_000_000, '25h 0m'],
  ])('%i ms reads as %s', (ms, expected) => {
    expect(formatTimelineDuration(ms)).toBe(expected);
  });
});
