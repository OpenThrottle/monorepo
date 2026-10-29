import { describe, expect, test } from 'vitest';

import {
  TOKEN_USAGE_COPY,
  TOKEN_USAGE_PROVIDERS,
  TOKEN_USAGE_SOURCE_LABELS,
  TOKEN_USAGE_SOURCES,
  TOKEN_USAGE_STATS,
  tokenUsageProviderLabel,
  tokenUsageSourceLabel,
} from '../token-usage-copy';

describe('tokenUsageProviderLabel', () => {
  test('maps every registered provider id to its label', () => {
    for (const provider of TOKEN_USAGE_PROVIDERS) {
      expect(tokenUsageProviderLabel(provider.id)).toBe(provider.label);
    }
  });

  test('falls back to the raw id for an unknown provider', () => {
    expect(tokenUsageProviderLabel('mistral')).toBe('mistral');
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

describe('tokenUsageSourceLabel', () => {
  test('labels every known source distinctly', () => {
    const labels = Object.values(TOKEN_USAGE_SOURCES).map(
      tokenUsageSourceLabel,
    );

    expect(new Set(labels).size).toBe(Object.keys(TOKEN_USAGE_SOURCES).length);
    for (const source of Object.values(TOKEN_USAGE_SOURCES)) {
      expect(TOKEN_USAGE_SOURCE_LABELS[source]).toBeDefined();
    }
  });

  test('falls back to the raw id for an unknown source', () => {
    expect(tokenUsageSourceLabel('some-future-tool')).toBe('some-future-tool');
  });
});
