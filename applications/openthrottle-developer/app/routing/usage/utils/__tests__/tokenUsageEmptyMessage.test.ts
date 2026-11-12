import { describe, expect, test } from 'vitest';

import { TOKEN_USAGE_COPY } from '~/routing/usage/data/data.token-usage-copy';
import { tokenUsageProviderLabel } from '~/routing/usage/utils/token-usage-labels';

import { tokenUsageEmptyMessage } from '../tokenUsageEmptyMessage';

describe('tokenUsageEmptyMessage', () => {
  describe('when no provider is selected', () => {
    test('returns the all-providers copy', () => {
      expect(tokenUsageEmptyMessage(null)).toBe(
        TOKEN_USAGE_COPY.emptyAllProviders,
      );
    });
  });

  describe('when a provider is selected', () => {
    test('returns the provider-specific copy with its label', () => {
      expect(tokenUsageEmptyMessage('anthropic')).toBe(
        TOKEN_USAGE_COPY.emptyForProvider(tokenUsageProviderLabel('anthropic')),
      );
    });
  });
});
