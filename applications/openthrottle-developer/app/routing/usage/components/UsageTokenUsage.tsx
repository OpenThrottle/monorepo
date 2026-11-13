import {
  formatTokenCount,
  formatUsageCost,
} from '@openthrottle/react-router-chat';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
} from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type {
  UsageTokenUsageByAccountFragment,
  UsageTokenUsageRowFragment,
  UsageTokenUsageTotalsFragment,
} from '~/__generated__/graphql';
import { UsageTokenUsageAccounts } from '~/routing/usage/components/UsageTokenUsageAccounts';
import { UsageTokenUsageFilters } from '~/routing/usage/components/UsageTokenUsageFilters';
import { UsageTokenUsageSources } from '~/routing/usage/components/UsageTokenUsageSources';
import { UsageTokenUsageTable } from '~/routing/usage/components/UsageTokenUsageTable';
import {
  TOKEN_USAGE_COPY,
  TOKEN_USAGE_STATS,
} from '~/routing/usage/data/data.token-usage-copy';
import { buildUsageSearch } from '~/routing/usage/utils/buildUsageSearch';
import { groupTokenUsage } from '~/routing/usage/utils/groupTokenUsage';
import { tokenUsageEmptyMessage } from '~/routing/usage/utils/tokenUsageEmptyMessage';

export interface UsageTokenUsageProps {
  /** The selection summed per agent account and provider, costliest first. */
  byAccount: readonly UsageTokenUsageByAccountFragment[];
  className?: string;
  /** Per-turn rows for the current selection (already provider-filtered server-side). */
  items: readonly UsageTokenUsageRowFragment[];
  rangeDays: number;
  /** Account filter from `?account=`, or null for every account. */
  selectedAccount: string | null;
  /** Provider id from `?provider=`, or null for all providers. */
  selectedProvider: string | null;
  /** Skill-usage search params to preserve when changing provider. */
  skillCwdParam?: string | null;
  skillGitBranchParam?: string | null;
  skillRepoParam?: string | null;
  skillScopeParam?: string | null;
  /** Summed usage over the current selection. */
  totals: UsageTokenUsageTotalsFragment;
}

export const UsageTokenUsage = (
  props: UsageTokenUsageProps,
): React.ReactElement => {
  const {
    byAccount,
    className,
    items,
    rangeDays,
    selectedAccount,
    selectedProvider,
    skillCwdParam = null,
    skillGitBranchParam = null,
    skillRepoParam = null,
    skillScopeParam = null,
    totals,
  } = props;

  // Hooks

  // Setup
  // All providers → break down by provider; a single provider → by model.
  const groups = React.useMemo(
    () =>
      groupTokenUsage(items, selectedProvider === null ? 'provider' : 'model'),
    [items, selectedProvider],
  );

  const isByProvider = selectedProvider === null;
  const hasGroups = groups.length > 0;
  const turnSuffix = totals.turnCount === 1 ? '' : 's';

  // Handlers
  const searchForAccount = (
    account: string | null,
    provider: string | null,
  ): string => {
    return buildUsageSearch({
      account,
      cwd: skillCwdParam,
      gitBranch: skillGitBranchParam,
      provider,
      repo: skillRepoParam,
      scope: skillScopeParam,
    });
  };

  // Markup
  const emptyState = (
    <p
      className="text-muted-foreground mt-6 text-sm"
      data-testid="UsageTokenUsageEmpty"
    >
      {tokenUsageEmptyMessage(selectedProvider)}
    </p>
  );
  const breakdownTable = (
    <UsageTokenUsageTable groups={groups} isByProvider={isByProvider} />
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('mt-8', className)} data-testid="UsageTokenUsage">
      <GlobalHeading
        className="mb-4"
        heading="h2"
        title={TOKEN_USAGE_COPY.heading}
      />
      <p className="text-muted-foreground mb-4 text-sm md:mb-6">
        {TOKEN_USAGE_COPY.intro(rangeDays)}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TOKEN_USAGE_STATS.map((stat) => {
          const value = totals[stat.field];
          const isCost = stat.kind === 'cost';
          const costDisplay = formatUsageCost(value) ?? '$0';
          const display = isCost ? costDisplay : formatTokenCount(value);

          return (
            <Card className="gap-0 py-4" key={stat.field}>
              <CardHeader className="px-4">
                <CardTitle className="text-muted-foreground text-xs font-medium">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <div className="text-foreground text-xl font-semibold tabular-nums">
                  {display}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {stat.hint}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <UsageTokenUsageFilters
        className="mt-6"
        selectedProvider={selectedProvider}
        skillCwdParam={skillCwdParam}
        skillGitBranchParam={skillGitBranchParam}
        skillRepoParam={skillRepoParam}
        skillScopeParam={skillScopeParam}
      />

      <p className="text-muted-foreground mt-3 text-xs">
        {formatTokenCount(totals.totalTokens)} tokens across {totals.turnCount}{' '}
        turn{turnSuffix}.
      </p>

      <UsageTokenUsageAccounts
        buckets={byAccount}
        rangeTotalTokens={totals.totalTokens}
        searchForAccount={searchForAccount}
        selectedAccount={selectedAccount}
      />

      <UsageTokenUsageSources items={items} />

      {hasGroups ? breakdownTable : emptyState}
    </div>
  );
};
