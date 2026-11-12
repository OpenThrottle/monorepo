import type { RenderResult } from '@testing-library/react';
import { render, within } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type {
  UsageTokenUsageByAccountFragment,
  UsageTokenUsageTotalsFragment,
} from '~/__generated__/graphql';
import { TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID } from '~/routing/usage/data/data.token-usage-copy';

import type { UsageTokenUsageAccountsProps } from '../UsageTokenUsageAccounts';
import { UsageTokenUsageAccounts } from '../UsageTokenUsageAccounts';

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

const subscriptionBucket: UsageTokenUsageByAccountFragment = {
  account: {
    credentialKind: 'subscription',
    email: 'dev@example.com',
    id: 'account-1',
    lastSeenAt: '2026-11-12T00:00:00.000Z',
    orgName: 'Example',
    plan: 'team',
    provider: 'claude',
  },
  provider: 'claude',
  totals: totals({ costUsd: 3, totalTokens: 750, turnCount: 5 }),
};

const unattributedBucket: UsageTokenUsageByAccountFragment = {
  account: null,
  provider: 'grok',
  totals: totals({ totalTokens: 250, turnCount: 1 }),
};

const searchForAccount = (
  account: string | null,
  provider: string | null,
): string => {
  const params = new URLSearchParams();
  if (provider !== null) {
    params.set('provider', provider);
  }
  if (account !== null) {
    params.set('account', account);
  }
  return `?${params.toString()}`;
};

const renderComponent = (
  overrides: Partial<UsageTokenUsageAccountsProps>,
): RenderResult => {
  const props: UsageTokenUsageAccountsProps = {
    buckets: [subscriptionBucket, unattributedBucket],
    rangeTotalTokens: 1000,
    searchForAccount,
    selectedAccount: null,
    ...overrides,
  };
  const Component = (): React.ReactElement | null => {
    return <UsageTokenUsageAccounts {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

const accountRow = (component: RenderResult, key: string): HTMLElement => {
  const row = component.container.querySelector<HTMLElement>(
    `[data-account="${key}"]`,
  );
  if (row === null) {
    throw new Error(`No row rendered for account ${key}`);
  }
  return row;
};

describe('UsageTokenUsageAccounts Component', () => {
  describe('with an identified and an unattributed bucket', () => {
    test('renders one row per bucket', () => {
      const component = renderComponent({});

      expect(
        within(accountRow(component, 'account-1')).getByRole('link'),
      ).toHaveAttribute('href', '/?provider=claude&account=account-1');
      expect(
        within(
          accountRow(component, `${TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID}:grok`),
        ).getByRole('link'),
      ).toHaveAttribute(
        'href',
        `/?provider=grok&account=${TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID}`,
      );
    });

    test('shows each bucket share of the range tokens', () => {
      const component = renderComponent({});

      expect(accountRow(component, 'account-1')).toHaveTextContent('75.0%');
    });

    test('does not offer to show all accounts', () => {
      const component = renderComponent({});

      expect(
        component.queryByTestId('UsageTokenUsageAccountsShowAll'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when filtered to one account', () => {
    test('marks that row current and offers to clear the filter', () => {
      const component = renderComponent({ selectedAccount: 'account-1' });

      expect(accountRow(component, 'account-1')).toHaveAttribute(
        'aria-current',
        'true',
      );
      expect(
        component.getByTestId('UsageTokenUsageAccountsShowAll'),
      ).toHaveAttribute('href', '/');
    });
  });

  describe('with no buckets', () => {
    test('renders nothing', () => {
      const component = renderComponent({ buckets: [] });

      expect(
        component.queryByTestId('UsageTokenUsageAccounts'),
      ).not.toBeInTheDocument();
    });
  });
});
