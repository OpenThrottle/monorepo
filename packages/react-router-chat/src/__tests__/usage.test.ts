import { describe, expect, it } from 'vitest';
import {
  formatTokenCount,
  formatUsageCost,
  hasUsageCounts,
  normalizeUsage,
  sumUsage,
} from '../usage';

describe('normalizeUsage', () => {
  it('normalizes claude terminal metadata (snake_case usage + totalCostUsd + modelUsage)', () => {
    expect(
      normalizeUsage({
        modelUsage: { 'claude-opus-4-8': { inputTokens: 1200 } },
        result: 'done',
        totalCostUsd: 0.042,
        usage: {
          cache_creation_input_tokens: 300,
          cache_read_input_tokens: 900,
          input_tokens: 1200,
          output_tokens: 340,
        },
      }),
    ).toEqual({
      cacheReadTokens: 900,
      cacheWriteTokens: 300,
      costUsd: 0.042,
      inputTokens: 1200,
      model: 'claude-opus-4-8',
      outputTokens: 340,
      totalTokens: 1540,
    });
  });

  it('normalizes cursor-agent metadata (camelCase usage, partial)', () => {
    expect(
      normalizeUsage({ result: 'hi', usage: { outputTokens: 35 } }),
    ).toEqual({ outputTokens: 35, totalTokens: 35 });
  });

  it('normalizes opencode mid-stream metadata (tokens tree + cost)', () => {
    expect(
      normalizeUsage({
        cost: 0,
        tokens: {
          cache: { read: 640, write: 0 },
          input: 7255,
          output: 3,
          reasoning: 0,
          total: 7898,
        },
      }),
    ).toEqual({
      cacheReadTokens: 640,
      cacheWriteTokens: 0,
      costUsd: 0,
      inputTokens: 7255,
      outputTokens: 3,
      totalTokens: 7898,
    });
  });

  it('normalizes an OpenAI-style usage block', () => {
    expect(
      normalizeUsage({
        usage: {
          completion_tokens: 50,
          prompt_tokens: 120,
          total_tokens: 170,
        },
      }),
    ).toEqual({ inputTokens: 120, outputTokens: 50, totalTokens: 170 });
  });

  it('accepts a JSON string as well as a record', () => {
    expect(
      normalizeUsage(JSON.stringify({ usage: { input_tokens: 10 } })),
    ).toEqual({ inputTokens: 10, totalTokens: 10 });
  });

  it('returns an empty object for missing/garbage/partial-less input without throwing', () => {
    expect(normalizeUsage(null)).toEqual({});
    expect(normalizeUsage(undefined)).toEqual({});
    expect(normalizeUsage('not json')).toEqual({});
    expect(normalizeUsage('')).toEqual({});
    expect(normalizeUsage(42)).toEqual({});
    expect(normalizeUsage([1, 2, 3])).toEqual({});
    expect(normalizeUsage({})).toEqual({});
    expect(normalizeUsage({ usage: null })).toEqual({});
    expect(normalizeUsage({ tokens: 5, usage: 'weird' })).toEqual({});
  });

  it('derives totalTokens only from present components', () => {
    expect(normalizeUsage({ usage: { input_tokens: 100 } })).toEqual({
      inputTokens: 100,
      totalTokens: 100,
    });
  });
});

describe('sumUsage', () => {
  it('adds token counts and cost, taking the most recent model', () => {
    expect(
      sumUsage(
        { costUsd: 0.01, inputTokens: 100, model: 'a', outputTokens: 20 },
        { costUsd: 0.02, inputTokens: 50, model: 'b', outputTokens: 10 },
      ),
    ).toEqual({
      costUsd: 0.03,
      inputTokens: 150,
      model: 'b',
      outputTokens: 30,
    });
  });

  it('keeps absent-on-both fields absent and treats absent-on-one as zero', () => {
    expect(sumUsage({}, {})).toEqual({});
    expect(sumUsage({ inputTokens: 5 }, {})).toEqual({ inputTokens: 5 });
    expect(sumUsage({}, { outputTokens: 7 })).toEqual({ outputTokens: 7 });
    expect(sumUsage({ inputTokens: 5 }, { inputTokens: 3 })).toEqual({
      inputTokens: 8,
    });
  });
});

describe('hasUsageCounts', () => {
  it('is false for undefined and all-absent usage', () => {
    expect(hasUsageCounts(undefined)).toBe(false);
    expect(hasUsageCounts({})).toBe(false);
    expect(hasUsageCounts({ model: 'x' })).toBe(false);
  });

  it('is true when any numeric count is present (including zero)', () => {
    expect(hasUsageCounts({ inputTokens: 0 })).toBe(true);
    expect(hasUsageCounts({ outputTokens: 5 })).toBe(true);
    expect(hasUsageCounts({ costUsd: 0.01 })).toBe(true);
  });
});

describe('formatTokenCount', () => {
  it('formats across magnitudes', () => {
    expect(formatTokenCount(340)).toBe('340');
    expect(formatTokenCount(1234)).toBe('1.2k');
    expect(formatTokenCount(12000)).toBe('12k');
    expect(formatTokenCount(12345)).toBe('12.3k');
    expect(formatTokenCount(1_500_000)).toBe('1.5M');
    expect(formatTokenCount(0)).toBe('0');
  });

  it('renders 0 for non-finite input', () => {
    expect(formatTokenCount(Number.NaN)).toBe('0');
    expect(formatTokenCount(Number.POSITIVE_INFINITY)).toBe('0');
  });
});

describe('formatUsageCost', () => {
  it('uses 3 decimals under $1 and 2 above', () => {
    expect(formatUsageCost(0.042)).toBe('$0.042');
    expect(formatUsageCost(1.2)).toBe('$1.20');
  });

  it('returns undefined for absent/non-finite cost', () => {
    expect(formatUsageCost(undefined)).toBeUndefined();
    expect(formatUsageCost(Number.NaN)).toBeUndefined();
  });
});
