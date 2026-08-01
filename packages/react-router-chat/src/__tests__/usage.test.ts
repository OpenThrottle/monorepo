import { describe, expect, it } from 'vitest';
import {
  formatTokenCount,
  formatUsageCost,
  hasUsageCounts,
  normalizeUsage,
  sumUsage,
} from '../usage';

/**
 * The canonical normalizer + its exhaustive per-backend fixtures now live in
 * `@openthrottle/agentic-token-usage`; this module only RE-EXPORTS them (so the
 * browser chat UI and the server persistence path run identical code). These
 * are re-export smoke tests confirming the wiring resolves and behaves — the
 * full matrix is covered in the leaf's own suite.
 */
describe('react-router-chat usage re-exports', () => {
  it('re-exports a working normalizeUsage (incl. reasoningTokens)', () => {
    expect(
      normalizeUsage({
        usage: { input_tokens: 120, output_tokens: 50, reasoning_tokens: 8 },
      }),
    ).toEqual({
      inputTokens: 120,
      outputTokens: 50,
      reasoningTokens: 8,
      totalTokens: 170,
    });
  });

  it('re-exports a working sumUsage', () => {
    expect(
      sumUsage({ inputTokens: 5 }, { inputTokens: 3, outputTokens: 7 }),
    ).toEqual({ inputTokens: 8, outputTokens: 7 });
  });

  it('re-exports hasUsageCounts + the UI formatters', () => {
    expect(hasUsageCounts({ inputTokens: 0 })).toBe(true);
    expect(hasUsageCounts({})).toBe(false);
    expect(formatTokenCount(12345)).toBe('12.3k');
    expect(formatUsageCost(0.042)).toBe('$0.042');
  });
});
