import { describe, expect, test } from 'vitest';

import { resolveContextWindowUsage } from '../chat-context-window';

describe('resolveContextWindowUsage', () => {
  test('is undefined unless both occupancy and window are reported', () => {
    expect(resolveContextWindowUsage({})).toBeUndefined();
    expect(resolveContextWindowUsage({ contextTokens: 5 })).toBeUndefined();
    expect(
      resolveContextWindowUsage({ contextWindowTokens: 100 }),
    ).toBeUndefined();
  });

  test('is undefined for a non-positive window', () => {
    expect(
      resolveContextWindowUsage({ contextTokens: 5, contextWindowTokens: 0 }),
    ).toBeUndefined();
  });

  test('ignores turn totals, which re-count the prompt per model call', () => {
    expect(
      resolveContextWindowUsage({
        cacheReadTokens: 900_000,
        contextWindowTokens: 200_000,
        inputTokens: 10,
      }),
    ).toBeUndefined();
  });

  test('rounds the fill and bands it by tone', () => {
    expect(
      resolveContextWindowUsage({
        contextTokens: 50_000,
        contextWindowTokens: 200_000,
      }),
    ).toEqual({
      percent: 25,
      tone: 'normal',
      usedTokens: 50_000,
      windowTokens: 200_000,
    });
    expect(
      resolveContextWindowUsage({ contextTokens: 75, contextWindowTokens: 100 })
        ?.tone,
    ).toBe('warning');
    expect(
      resolveContextWindowUsage({ contextTokens: 90, contextWindowTokens: 100 })
        ?.tone,
    ).toBe('critical');
  });

  test('clamps an over-full window to 100%', () => {
    expect(
      resolveContextWindowUsage({
        contextTokens: 250,
        contextWindowTokens: 100,
      })?.percent,
    ).toBe(100);
  });
});
