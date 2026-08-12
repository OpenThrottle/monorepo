import { describe, expect, test } from 'vitest';
import {
  TOKEN_USAGE_COPY,
  TOKEN_USAGE_PROVIDERS,
  TOKEN_USAGE_STATS,
  tokenUsageProviderLabel,
} from './token-usage-copy';

describe('tokenUsageProviderLabel', () => {
  test('maps every registered provider id to its label', () => {
    for (const provider of TOKEN_USAGE_PROVIDERS) {
      expect(tokenUsageProviderLabel(provider.id)).toBe(provider.label);
    }
  });

  test('falls back to the raw id for an unknown provider', () => {
    expect(tokenUsageProviderLabel('gemini')).toBe('gemini');
  });
});

describe('TOKEN_USAGE_STATS', () => {
  test('leads with the total-tokens tile and includes the cost tile', () => {
    expect(TOKEN_USAGE_STATS[0]?.field).toBe('totalTokens');
    expect(TOKEN_USAGE_STATS.some((stat) => stat.kind === 'cost')).toBe(true);
  });
});

describe('TOKEN_USAGE_COPY', () => {
  test('interpolates provider label and range length', () => {
    expect(TOKEN_USAGE_COPY.emptyForProvider('Claude')).toContain('Claude');
    expect(TOKEN_USAGE_COPY.intro(14)).toContain('last 14 days');
  });
});
