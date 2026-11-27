import { describe, expect, it } from 'vitest';

import type { FormatDurationOptions } from '../duration.ts';
import { formatDuration } from '../duration.ts';

// Outputs captured from the five formatters this one replaced, before they were removed.
const OPTIONS = {
  between: { dropZeroTail: true, largestUnit: 'day', rounding: 'floor' },
  chat: { padded: true, rounding: 'floor' },
  hooks: { rounding: 'round' },
  loop: { largestUnit: 'minute', rounding: 'round' },
  schedule: { maxUnits: 3, rounding: 'round' },
} satisfies Record<string, FormatDurationOptions>;

const SNAPSHOTS: ReadonlyArray<
  readonly [
    string,
    FormatDurationOptions,
    ReadonlyArray<readonly [number, string]>,
  ]
> = [
  [
    'chat',
    OPTIONS.chat,
    [
      [-5, '0s'],
      [0, '0s'],
      [400, '0s'],
      [499, '0s'],
      [500, '0s'],
      [999, '0s'],
      [1000, '1s'],
      [1500, '1s'],
      [45000, '45s'],
      [59499, '59s'],
      [59500, '59s'],
      [59999, '59s'],
      [60000, '1m 00s'],
      [185000, '3m 05s'],
      [750000, '12m 30s'],
      [3599499, '59m 59s'],
      [3599500, '59m 59s'],
      [3600000, '1h 00m'],
      [3720000, '1h 02m'],
      [3840000, '1h 04m'],
      [3605000, '1h 00m'],
      [5400000, '1h 30m'],
      [86399000, '23h 59m'],
      [86400000, '24h 00m'],
      [90000000, '25h 00m'],
      [100000000, '27h 46m'],
      [1800000, '30m 00s'],
    ],
  ],
  [
    'hooks',
    OPTIONS.hooks,
    [
      [-5, '0s'],
      [0, '0s'],
      [400, '0s'],
      [499, '0s'],
      [500, '1s'],
      [999, '1s'],
      [1000, '1s'],
      [1500, '2s'],
      [45000, '45s'],
      [59499, '59s'],
      [59500, '1m 0s'],
      [59999, '1m 0s'],
      [60000, '1m 0s'],
      [185000, '3m 5s'],
      [750000, '12m 30s'],
      [3599499, '59m 59s'],
      [3599500, '1h 0m'],
      [3600000, '1h 0m'],
      [3720000, '1h 2m'],
      [3840000, '1h 4m'],
      [3605000, '1h 0m'],
      [5400000, '1h 30m'],
      [86399000, '23h 59m'],
      [86400000, '24h 0m'],
      [90000000, '25h 0m'],
      [100000000, '27h 46m'],
      [1800000, '30m 0s'],
    ],
  ],
  [
    'loop',
    OPTIONS.loop,
    [
      [-5, '0s'],
      [0, '0s'],
      [400, '0s'],
      [499, '0s'],
      [500, '1s'],
      [999, '1s'],
      [1000, '1s'],
      [1500, '2s'],
      [45000, '45s'],
      [59499, '59s'],
      [59500, '1m 0s'],
      [59999, '1m 0s'],
      [60000, '1m 0s'],
      [185000, '3m 5s'],
      [750000, '12m 30s'],
      [3599499, '59m 59s'],
      [3599500, '60m 0s'],
      [3600000, '60m 0s'],
      [3720000, '62m 0s'],
      [3840000, '64m 0s'],
      [3605000, '60m 5s'],
      [5400000, '90m 0s'],
      [86399000, '1439m 59s'],
      [86400000, '1440m 0s'],
      [90000000, '1500m 0s'],
      [100000000, '1666m 40s'],
      [1800000, '30m 0s'],
    ],
  ],
  [
    'schedule',
    OPTIONS.schedule,
    [
      [500, '1s'],
      [999, '1s'],
      [1000, '1s'],
      [1500, '2s'],
      [45000, '45s'],
      [59499, '59s'],
      [59500, '1m 0s'],
      [59999, '1m 0s'],
      [60000, '1m 0s'],
      [185000, '3m 5s'],
      [750000, '12m 30s'],
      [3599499, '59m 59s'],
      [3599500, '1h 0m 0s'],
      [3600000, '1h 0m 0s'],
      [3720000, '1h 2m 0s'],
      [3840000, '1h 4m 0s'],
      [3605000, '1h 0m 5s'],
      [5400000, '1h 30m 0s'],
      [86399000, '23h 59m 59s'],
      [86400000, '24h 0m 0s'],
      [90000000, '25h 0m 0s'],
      [100000000, '27h 46m 40s'],
      [1800000, '30m 0s'],
    ],
  ],
  [
    'between',
    OPTIONS.between,
    [
      [0, '0s'],
      [400, '0s'],
      [499, '0s'],
      [500, '0s'],
      [999, '0s'],
      [1000, '1s'],
      [1500, '1s'],
      [45000, '45s'],
      [59499, '59s'],
      [59500, '59s'],
      [59999, '59s'],
      [60000, '1m'],
      [185000, '3m 5s'],
      [750000, '12m 30s'],
      [3599499, '59m 59s'],
      [3599500, '59m 59s'],
      [3600000, '1h'],
      [3720000, '1h 2m'],
      [3840000, '1h 4m'],
      [3605000, '1h'],
      [5400000, '1h 30m'],
      [86399000, '23h 59m'],
      [86400000, '1d'],
      [90000000, '1d 1h'],
      [100000000, '1d 3h'],
      [1800000, '30m'],
    ],
  ],
];

describe('formatDuration', () => {
  describe.each(SNAPSHOTS)('%s preset', (_name, options, rows) => {
    it.each(rows)('formats %d ms', (ms, expected) => {
      expect(formatDuration(ms, options)).toBe(expected);
    });
  });

  describe('defaults', () => {
    it('rounds, does not pad and shows two units up to hours', () => {
      expect(formatDuration(3_599_500)).toBe('1h 0m');
      expect(formatDuration(185_000)).toBe('3m 5s');
    });
  });

  describe('invalid input', () => {
    it('reads negative and non-finite input as 0s', () => {
      expect(formatDuration(-5)).toBe('0s');
      expect(formatDuration(Number.NaN)).toBe('0s');
      expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('0s');
    });
  });

  describe('maxUnits', () => {
    it('limits to one unit', () => {
      expect(formatDuration(3_720_000, { maxUnits: 1 })).toBe('1h');
    });
  });
});
