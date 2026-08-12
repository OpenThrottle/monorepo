import { describe, expect, test } from 'vitest';
import {
  formatRunCost,
  formatRunTotalTokens,
  formatSettingsSnapshot,
  hasRunUsage,
  runUsageRows,
  runUsageTooltip,
  type RunUsage,
} from '../format-usage';

const EMPTY_USAGE: RunUsage = {};

describe('hasRunUsage', () => {
  test('returns false when no usage field is set', () => {
    expect(hasRunUsage(EMPTY_USAGE)).toBe(false);
  });

  test('returns true when at least one token count is set', () => {
    expect(hasRunUsage({ inputTokens: 10 })).toBe(true);
    expect(hasRunUsage({ outputTokens: 10 })).toBe(true);
    expect(hasRunUsage({ cacheReadTokens: 10 })).toBe(true);
    expect(hasRunUsage({ cacheWriteTokens: 10 })).toBe(true);
    expect(hasRunUsage({ reasoningTokens: 10 })).toBe(true);
    expect(hasRunUsage({ totalTokens: 10 })).toBe(true);
  });

  test('returns true when only cost is set', () => {
    expect(hasRunUsage({ costUsd: 0.5 })).toBe(true);
  });
});

describe('formatRunTotalTokens', () => {
  test('returns an em dash when totalTokens is unreported', () => {
    expect(formatRunTotalTokens(EMPTY_USAGE)).toBe('—');
  });

  test('formats a compact token count when totalTokens is present', () => {
    expect(formatRunTotalTokens({ totalTokens: 12345 })).toBe('12.3k');
  });
});

describe('formatRunCost', () => {
  test('returns an em dash when costUsd is unreported', () => {
    expect(formatRunCost(EMPTY_USAGE)).toBe('—');
  });

  test('formats a dollar amount when costUsd is present', () => {
    expect(formatRunCost({ costUsd: 0.042 })).toBe('$0.042');
    expect(formatRunCost({ costUsd: 1.2 })).toBe('$1.20');
  });
});

describe('runUsageRows', () => {
  test('returns an empty array when no usage kind is reported', () => {
    expect(runUsageRows(EMPTY_USAGE)).toEqual([]);
  });

  test('includes a row only for each reported kind, in a fixed order', () => {
    const usage: RunUsage = {
      cacheReadTokens: 3,
      inputTokens: 1,
      outputTokens: 2,
      totalTokens: 6,
    };

    expect(runUsageRows(usage)).toEqual([
      { label: 'Input', value: '1' },
      { label: 'Output', value: '2' },
      { label: 'Cache read', value: '3' },
      { label: 'Total', value: '6' },
    ]);
  });
});

describe('runUsageTooltip', () => {
  test('returns undefined when there is no usage at all', () => {
    expect(runUsageTooltip(EMPTY_USAGE)).toBeUndefined();
  });

  test('joins the per-kind rows with the cost appended', () => {
    const usage: RunUsage = { costUsd: 0.5, inputTokens: 100 };
    expect(runUsageTooltip(usage)).toBe('Input 100 · Cost $0.500');
  });

  test('omits the cost segment when costUsd is absent', () => {
    const usage: RunUsage = { inputTokens: 100 };
    expect(runUsageTooltip(usage)).toBe('Input 100');
  });
});

describe('formatSettingsSnapshot', () => {
  test('returns null for null, undefined, or an empty string', () => {
    expect(formatSettingsSnapshot(null)).toBeNull();
    expect(formatSettingsSnapshot(undefined)).toBeNull();
    expect(formatSettingsSnapshot('')).toBeNull();
  });

  test('pretty-prints valid JSON', () => {
    expect(formatSettingsSnapshot('{"a":1}')).toBe(
      JSON.stringify({ a: 1 }, null, 2),
    );
  });

  test('falls back to the raw string when JSON parsing fails', () => {
    expect(formatSettingsSnapshot('not json')).toBe('not json');
  });
});
