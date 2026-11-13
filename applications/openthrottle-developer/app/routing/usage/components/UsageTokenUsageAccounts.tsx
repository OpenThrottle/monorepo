import {
  formatTokenCount,
  formatUsageCost,
} from '@openthrottle/react-router-chat';
import {
  Badge,
  cn,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { Link } from 'react-router';

import type { UsageTokenUsageByAccountFragment } from '~/__generated__/graphql';
import {
  TOKEN_USAGE_COPY,
  TOKEN_USAGE_CREDENTIAL_BADGE_COLORS,
} from '~/routing/usage/data/data.token-usage-copy';
import { toTokenUsageAccountRows } from '~/routing/usage/utils/toTokenUsageAccountRows';

export interface UsageTokenUsageAccountsProps {
  /** Per-account buckets for the current selection, costliest first. */
  buckets: readonly UsageTokenUsageByAccountFragment[];
  className?: string;
  /** Total tokens over the current selection (the share denominator). */
  rangeTotalTokens: number;
  /** Usage search for an account (+ its provider) filter; `(null, null)` clears it. */
  searchForAccount: (account: string | null, provider: string | null) => string;
  /** `?account=` value, or null when every account is shown. */
  selectedAccount: string | null;
}

export const UsageTokenUsageAccounts = (
  props: UsageTokenUsageAccountsProps,
): React.ReactElement | null => {
  const {
    buckets,
    className,
    rangeTotalTokens,
    searchForAccount,
    selectedAccount,
  } = props;

  // Hooks

  // Setup
  const rows = React.useMemo(
    () => toTokenUsageAccountRows(buckets, rangeTotalTokens),
    [buckets, rangeTotalTokens],
  );
  const { accounts: copy } = TOKEN_USAGE_COPY;
  const isFiltered = selectedAccount !== null;

  // Handlers

  // Markup
  const showAllLink = (
    <Link
      className="text-primary text-xs underline-offset-4 hover:underline"
      data-testid="UsageTokenUsageAccountsShowAll"
      to={searchForAccount(null, null)}
    >
      {copy.showAll}
    </Link>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (rows.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('mt-6', className)}
      data-testid="UsageTokenUsageAccounts"
    >
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <GlobalHeading heading="h3" title={copy.heading} />
        {isFiltered ? showAllLink : null}
      </div>
      <p className="text-muted-foreground mb-3 text-xs">{copy.intro}</p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.columnAccount}</TableHead>
              <TableHead>{copy.columnPlan}</TableHead>
              <TableHead className="text-right">{copy.columnTurns}</TableHead>
              <TableHead className="text-right">{copy.columnTotal}</TableHead>
              <TableHead className="text-right">{copy.columnShare}</TableHead>
              <TableHead className="text-right">{copy.columnCost}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const cost =
                row.costUsd === null ? null : formatUsageCost(row.costUsd);
              const prefix = row.isEstimate ? copy.estimatePrefix : '';
              const isSelected = selectedAccount === row.filterAccountId;
              const badgeColor =
                TOKEN_USAGE_CREDENTIAL_BADGE_COLORS[row.credentialKind ?? ''];

              return (
                <TableRow
                  aria-current={isSelected ? 'true' : undefined}
                  data-account={row.key}
                  key={row.key}
                >
                  <TableCell>
                    <Link
                      className="text-foreground font-medium underline-offset-4 hover:underline"
                      to={searchForAccount(row.filterAccountId, row.provider)}
                    >
                      {row.label}
                    </Link>
                    <div className="text-muted-foreground text-xs">
                      {row.detail}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {row.credentialLabel !== null && (
                        <Badge color={badgeColor} size="xs">
                          {row.credentialLabel}
                        </Badge>
                      )}
                      {row.plan !== null && (
                        <Badge color="slate" size="xs">
                          {row.plan}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.turnCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatTokenCount(row.totalTokens)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {`${row.sharePercent.toFixed(1)}%`}
                  </TableCell>
                  <TableCell
                    className="text-right whitespace-nowrap tabular-nums"
                    title={row.isEstimate ? copy.estimateTitle : undefined}
                  >
                    {cost === null ? '—' : `${prefix}${cost}`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
