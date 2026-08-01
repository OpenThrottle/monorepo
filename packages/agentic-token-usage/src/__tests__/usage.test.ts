import { describe, expect, it } from 'vitest';
import {
  formatTokenCount,
  formatUsageCost,
  hasUsageCounts,
  normalizeUsage,
  sumUsage,
  type NormalizedTokenUsage,
} from '../usage.ts';

/**
 * One fixture per wired backend, using REAL captured usage-chunk metadata
 * shapes (pulled from each backend's `events.ts`/`events.test.ts` and the
 * `docs/openthrottle/*-stream-json-schema.md` docs). The `metadata` field is
 * exactly what the server collects into a `usage`-kind toolEvent and feeds to
 * `normalizeUsage`. The parity test below asserts every registered backend id
 * has a fixture so a new driver cannot silently ship without normalizer
 * coverage.
 */
const BACKEND_FIXTURES: Record<
  string,
  { readonly expected: NormalizedTokenUsage; readonly metadata: unknown }
> = {
  // claude: single terminal `result` chunk — snake_case usage + modelUsage + totalCostUsd.
  claude: {
    expected: {
      cacheReadTokens: 900,
      cacheWriteTokens: 300,
      costUsd: 0.042,
      inputTokens: 1200,
      model: 'claude-opus-4-8',
      outputTokens: 340,
      totalTokens: 1540,
    },
    metadata: {
      modelUsage: { 'claude-opus-4-8': { inputTokens: 1200 } },
      result: 'done',
      totalCostUsd: 0.042,
      usage: {
        cache_creation_input_tokens: 300,
        cache_read_input_tokens: 900,
        input_tokens: 1200,
        output_tokens: 340,
      },
    },
  },
  // codex: single terminal `turn.completed` chunk.
  codex: {
    expected: { inputTokens: 10, outputTokens: 3, totalTokens: 13 },
    metadata: { usage: { input_tokens: 10, output_tokens: 3 } },
  },
  // cursor: single terminal chunk, camelCase, partial.
  cursor: {
    expected: { outputTokens: 35, totalTokens: 35 },
    metadata: { result: 'hi', usage: { outputTokens: 35 } },
  },
  // grok: single terminal `end` chunk — snake_case usage carrying reasoning_tokens.
  grok: {
    expected: {
      cacheReadTokens: 128,
      inputTokens: 14537,
      outputTokens: 35,
      reasoningTokens: 34,
      totalTokens: 14700,
    },
    metadata: {
      modelUsage: null,
      numTurns: 1,
      stopReason: 'stop',
      usage: {
        cache_read_input_tokens: 128,
        input_tokens: 14537,
        output_tokens: 35,
        reasoning_tokens: 34,
        total_tokens: 14700,
      },
    },
  },
  // openai (HTTP backend): OpenAI-style prompt/completion/total block.
  openai: {
    expected: { inputTokens: 120, outputTokens: 50, totalTokens: 170 },
    metadata: {
      usage: {
        completion_tokens: 50,
        prompt_tokens: 120,
        total_tokens: 170,
      },
    },
  },
  // opencode: ONE mid-stream `step_finish` chunk — tokens tree + cost + reasoning.
  opencode: {
    expected: {
      cacheReadTokens: 640,
      cacheWriteTokens: 0,
      costUsd: 0,
      inputTokens: 7255,
      outputTokens: 3,
      reasoningTokens: 0,
      totalTokens: 7898,
    },
    metadata: {
      cost: 0,
      tokens: {
        cache: { read: 640, write: 0 },
        input: 7255,
        output: 3,
        reasoning: 0,
        total: 7898,
      },
    },
  },
};

describe('normalizeUsage — per-backend fixtures', () => {
  for (const [backend, { expected, metadata }] of Object.entries(
    BACKEND_FIXTURES,
  )) {
    it(`normalizes ${backend} terminal/mid-stream usage metadata`, () => {
      expect(normalizeUsage(metadata)).toEqual(expected);
    });
  }

  it('has a fixture for every wired CLI backend + the openai HTTP backend', () => {
    // Parity guard: mirrors CONVERSATION_CLI_BACKENDS keys (claude/codex/cursor/
    // grok/opencode) plus the default openai HTTP backend. A new driver adding a
    // conversation backend must add its normalizer fixture here.
    expect(Object.keys(BACKEND_FIXTURES).sort()).toEqual([
      'claude',
      'codex',
      'cursor',
      'grok',
      'openai',
      'opencode',
    ]);
  });
});

describe('normalizeUsage — edge cases', () => {
  it('accepts a JSON string as well as a record', () => {
    expect(
      normalizeUsage(JSON.stringify({ usage: { input_tokens: 10 } })),
    ).toEqual({ inputTokens: 10, totalTokens: 10 });
  });

  it('returns an empty object for missing/garbage input without throwing', () => {
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

describe('sumUsage — opencode multi-step accumulation', () => {
  it('folds two mid-stream opencode chunks into one turn total', () => {
    const stepA = normalizeUsage({
      cost: 0.01,
      tokens: {
        cache: { read: 100, write: 10 },
        input: 500,
        output: 20,
        reasoning: 5,
        total: 520,
      },
    });
    const stepB = normalizeUsage({
      cost: 0.02,
      tokens: {
        cache: { read: 40, write: 0 },
        input: 300,
        output: 80,
        reasoning: 15,
        total: 380,
      },
    });

    expect(sumUsage(stepA, stepB)).toEqual({
      cacheReadTokens: 140,
      cacheWriteTokens: 10,
      costUsd: 0.03,
      inputTokens: 800,
      outputTokens: 100,
      reasoningTokens: 20,
      totalTokens: 900,
    });
  });

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
    expect(sumUsage({}, { reasoningTokens: 7 })).toEqual({
      reasoningTokens: 7,
    });
    expect(sumUsage({ inputTokens: 5 }, { inputTokens: 3 })).toEqual({
      inputTokens: 8,
    });
  });
});

describe('hasUsageCounts', () => {
  it('is false for undefined and count-less usage', () => {
    expect(hasUsageCounts(undefined)).toBe(false);
    expect(hasUsageCounts({})).toBe(false);
    expect(hasUsageCounts({ model: 'x' })).toBe(false);
  });

  it('is true when any numeric count is present (including zero)', () => {
    expect(hasUsageCounts({ inputTokens: 0 })).toBe(true);
    expect(hasUsageCounts({ reasoningTokens: 5 })).toBe(true);
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
