import { describe, expect, test } from 'vitest';

import type {
  UsageTokenUsageByAccountFragment,
  UsageTokenUsageTotalsFragment,
} from '~/__generated__/graphql';
import {
  TOKEN_USAGE_COPY,
  TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID,
} from '~/routing/usage/data/data.token-usage-copy';

import { toTokenUsageAccountRows } from '../toTokenUsageAccountRows';

const totals = (
  overrides: Partial<UsageTokenUsageTotalsFragment>,
): UsageTokenUsageTotalsFragment => {
  return {
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    turnCount: 0,
    ...overrides,
  };
};

const account = (
  overrides: Partial<NonNullable<UsageTokenUsageByAccountFragment['account']>>,
): NonNullable<UsageTokenUsageByAccountFragment['account']> => {
  return {
    credentialKind: 'subscription',
    email: 'dev@example.com',
    id: 'account-1',
    lastSeenAt: '2026-11-12T00:00:00.000Z',
    orgName: 'Example',
    plan: 'team',
    provider: 'claude',
    ...overrides,
  };
};

describe('toTokenUsageAccountRows', () => {
  describe('a subscription account', () => {
    test('labels by email, filters by account id and marks the cost an estimate', () => {
      const [row] = toTokenUsageAccountRows(
        [
          {
            account: account({}),
            provider: 'claude',
            totals: totals({ costUsd: 2, totalTokens: 250, turnCount: 4 }),
          },
        ],
        1000,
      );

      expect(row).toMatchObject({
        costUsd: 2,
        credentialKind: 'subscription',
        filterAccountId: 'account-1',
        isEstimate: true,
        key: 'account-1',
        label: 'dev@example.com',
        plan: 'team',
        sharePercent: 25,
        turnCount: 4,
      });
      expect(row?.detail).toContain('Example');
    });
  });

  describe('a personal login whose org is named after its email', () => {
    test('leaves the org out of the detail line', () => {
      const [row] = toTokenUsageAccountRows(
        [
          {
            account: account({ orgName: `dev@example.com's Organization` }),
            provider: 'claude',
            totals: totals({}),
          },
        ],
        0,
      );

      expect(row?.detail).toBe('Claude');
    });
  });

  describe('an API-key account', () => {
    test('is not an estimate and is labelled as an API key when it has no email', () => {
      const [row] = toTokenUsageAccountRows(
        [
          {
            account: account({
              credentialKind: 'api_key',
              email: null,
              plan: null,
            }),
            provider: 'claude',
            totals: totals({ costUsd: 1 }),
          },
        ],
        0,
      );

      expect(row).toMatchObject({
        isEstimate: false,
        label: TOKEN_USAGE_COPY.accounts.apiKeyLabel,
        sharePercent: 0,
      });
    });
  });

  describe('an account with no email', () => {
    test('falls back to a provider account label', () => {
      const [row] = toTokenUsageAccountRows(
        [
          {
            account: account({ email: null, orgName: null, provider: 'codex' }),
            provider: 'codex',
            totals: totals({}),
          },
        ],
        0,
      );

      expect(row?.label).toBe(TOKEN_USAGE_COPY.accounts.fallbackLabel('Codex'));
    });
  });

  describe('the unattributed bucket', () => {
    test('filters by the unattributed sentinel and keys on the provider', () => {
      const [row] = toTokenUsageAccountRows(
        [
          {
            account: null,
            provider: 'grok',
            totals: totals({ totalTokens: 10 }),
          },
        ],
        10,
      );

      expect(row).toMatchObject({
        credentialKind: null,
        filterAccountId: TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID,
        key: `${TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID}:grok`,
        label: TOKEN_USAGE_COPY.accounts.unattributedLabel,
        sharePercent: 100,
      });
    });
  });

  describe('a bucket with no priced usage', () => {
    test('has no cost rather than $0', () => {
      const [row] = toTokenUsageAccountRows(
        [{ account: account({}), provider: 'claude', totals: totals({}) }],
        0,
      );

      expect(row?.costUsd).toBeNull();
    });
  });
});
