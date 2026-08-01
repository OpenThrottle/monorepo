import * as React from 'react';
import clsx from 'clsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import {
  formatTokenCount,
  formatUsageCost,
} from '@openthrottle/react-router-chat';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { UsageTokenUsageFilters } from '~/routing/usage/components/UsageTokenUsageFilters';
import { groupTokenUsage } from '~/routing/usage/utils/aggregate-token-usage';
import {
  TOKEN_USAGE_COPY,
  TOKEN_USAGE_STATS,
  tokenUsageProviderLabel,
} from '~/routing/usage/data/token-usage-copy';
import type {
  UsageTokenUsageRowFragment,
  UsageTokenUsageTotalsFragment,
} from '~/__generated__/graphql';

export interface UsageTokenUsageProps {
  className?: string;
  /** Per-turn rows for the current selection (already provider-filtered server-side). */
  items: readonly UsageTokenUsageRowFragment[];
  rangeDays: number;
  /** Provider id from `?provider=`, or null for all providers. */
  selectedProvider: string | null;
  /** Skill-usage search params to preserve when changing provider. */
  skillCwdParam?: string | null;
  skillGitBranchParam?: string | null;
  skillScopeParam?: string | null;
  /** Summed usage over the current selection. */
  totals: UsageTokenUsageTotalsFragment;
}

export const UsageTokenUsage = (
  props: UsageTokenUsageProps,
): React.ReactElement => {
  const {
    className,
    items,
    rangeDays,
    selectedProvider,
    skillCwdParam = null,
    skillGitBranchParam = null,
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

  const breakdownLabel = selectedProvider === null ? 'Provider' : 'Model';

  const emptyMessage =
    selectedProvider === null
      ? TOKEN_USAGE_COPY.emptyAllProviders
      : TOKEN_USAGE_COPY.emptyForProvider(
          tokenUsageProviderLabel(selectedProvider),
        );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('mt-8', className)} data-testid="UsageTokenUsage">
      <GlobalHeading
        className="mb-4"
        heading="h2"
        title={TOKEN_USAGE_COPY.heading}
      />
      <p className="text-muted-foreground mb-4 text-sm md:mb-6">
        {TOKEN_USAGE_COPY.intro(rangeDays)}
      </p>

      <UsageTokenUsageFilters
        selectedProvider={selectedProvider}
        skillCwdParam={skillCwdParam}
        skillGitBranchParam={skillGitBranchParam}
        skillScopeParam={skillScopeParam}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TOKEN_USAGE_STATS.map((stat) => {
          const value = totals[stat.field];
          const display =
            stat.kind === 'cost'
              ? (formatUsageCost(value) ?? '$0')
              : formatTokenCount(value);

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

      <p className="text-muted-foreground mt-3 text-xs">
        {formatTokenCount(totals.totalTokens)} tokens across {totals.turnCount}{' '}
        turn{totals.turnCount === 1 ? '' : 's'}.
      </p>

      {groups.length === 0 ? (
        <p
          className="text-muted-foreground mt-6 text-sm"
          data-testid="UsageTokenUsageEmpty"
        >
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{breakdownLabel}</TableHead>
                <TableHead className="text-right">Turns</TableHead>
                <TableHead className="text-right">Input</TableHead>
                <TableHead className="text-right">Output</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.key}>
                  <TableCell className="font-medium">
                    {selectedProvider === null
                      ? tokenUsageProviderLabel(group.key)
                      : group.key}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {group.turnCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTokenCount(group.inputTokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTokenCount(group.outputTokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTokenCount(group.totalTokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsageCost(group.costUsd) ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
