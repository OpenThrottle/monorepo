import { describe, expect, it } from 'vitest';

import { estimateAnthropicListPriceUsd } from './anthropic-list-price.ts';

/** A real-shaped Claude Code transcript usage object (counts only). */
const usage = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  cache_creation: {
    ephemeral_1h_input_tokens: 2_000,
    ephemeral_5m_input_tokens: 1_000,
  },
  cache_creation_input_tokens: 3_000,
  cache_read_input_tokens: 100_000,
  inference_geo: 'global',
  input_tokens: 10,
  output_tokens: 500,
  service_tier: 'standard',
  speed: 'standard',
  ...overrides,
});

const estimate = (
  rawUsage: Record<string, unknown> | null,
  model: string | null = 'claude-opus-5-5',
  provider = 'claude',
): number | null =>
  estimateAnthropicListPriceUsd({ model, provider, rawUsage });

describe('estimateAnthropicListPriceUsd', () => {
  describe('when the model is in the table', () => {
    it('prices every token category at its own rate, including the 5m/1h cache-write split', () => {
      // Opus 5.5: input 4, output 20, cache read 0.2, write 5m 5, write 1h 8 ($/MTok).
      const expected =
        (10 * 4 + 500 * 20 + 100_000 * 0.2 + 1_000 * 5 + 2_000 * 8) / 1e6;
      expect(estimate(usage())).toBeCloseTo(expected, 10);
    });

    it('treats an absent cache read and no cache writes as zero', () => {
      expect(
        estimate(
          usage({
            cache_creation: undefined,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: undefined,
          }),
          'claude-sonnet-5',
        ),
      ).toBeCloseTo((10 * 2 + 500 * 10) / 1e6, 10);
    });

    it('applies the 1.1x multiplier to US-only inference', () => {
      const global = estimate(usage());
      expect(global).not.toBeNull();
      expect(estimate(usage({ inference_geo: 'us' }))).toBeCloseTo(
        (global ?? 0) * 1.1,
        10,
      );
    });

    it('prices `not_available` and absent geography at standard rates', () => {
      const global = estimate(usage());
      expect(estimate(usage({ inference_geo: 'not_available' }))).toBe(global);
      expect(estimate(usage({ inference_geo: undefined }))).toBe(global);
    });

    it('accepts the provider spelled `anthropic`', () => {
      expect(estimate(usage(), 'claude-opus-5-5', 'anthropic')).toBe(
        estimate(usage()),
      );
    });
  });

  describe('when the model is priced by prompt length', () => {
    const haiku = (promptTokens: number): number | null =>
      estimate(
        usage({
          cache_creation: undefined,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
          input_tokens: promptTokens,
          output_tokens: 0,
        }),
        'claude-haiku-5-5',
      );

    it('uses the lower prices at exactly the threshold', () => {
      expect(haiku(100_000)).toBeCloseTo((100_000 * 0.1) / 1e6, 10);
    });

    it('uses the higher prices for every token once the prompt is over it', () => {
      expect(haiku(100_001)).toBeCloseTo((100_001 * 0.5) / 1e6, 10);
    });

    it('counts cache reads and writes toward the prompt length', () => {
      expect(
        estimate(
          usage({
            cache_read_input_tokens: 99_000,
            input_tokens: 10,
            output_tokens: 0,
          }),
          'claude-haiku-5-5',
        ),
      ).toBeCloseTo(
        (10 * 0.5 + 99_000 * 0.05 + 1_000 * 0.625 + 2_000 * 1) / 1e6,
        10,
      );
    });
  });

  describe('when the request cannot be priced exactly', () => {
    it.each([
      ['an unknown model', usage(), 'claude-unknown-9'],
      ['a prototype key as the model', usage(), 'constructor'],
      ['no model', usage(), null],
      ['no raw usage', null, 'claude-opus-5-5'],
      ['fast mode', usage({ speed: 'fast' }), 'claude-opus-5-5'],
      [
        'a non-standard service tier',
        usage({ service_tier: 'priority' }),
        'claude-opus-5-5',
      ],
      [
        'an unrecognized geography',
        usage({ inference_geo: 'eu' }),
        'claude-opus-5-5',
      ],
      [
        'missing output tokens',
        usage({ output_tokens: undefined }),
        'claude-opus-5-5',
      ],
      ['a negative count', usage({ input_tokens: -1 }), 'claude-opus-5-5'],
      [
        'cache writes without their split',
        usage({ cache_creation: undefined }),
        'claude-opus-5-5',
      ],
      [
        'a split that does not add up',
        usage({ cache_creation_input_tokens: 3_001 }),
        'claude-opus-5-5',
      ],
    ])('returns null, never 0, for %s', (_label, rawUsage, model) => {
      expect(estimate(rawUsage, model)).toBeNull();
    });

    it('returns null for a provider that is not billed at Anthropic list prices', () => {
      expect(estimate(usage(), 'claude-opus-5-5', 'bedrock')).toBeNull();
    });
  });
});
