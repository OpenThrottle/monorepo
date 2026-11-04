import {
  formatTokenCount,
  formatUsageCost,
} from '@openthrottle/react-router-chat';
import {
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

import type { UsageTokenUsageRowFragment } from '~/__generated__/graphql';
import {
  TOKEN_USAGE_COPY,
  tokenUsageSourceLabel,
} from '~/routing/usage/data/token-usage-copy';
import { groupTokenUsage } from '~/routing/usage/utils/aggregate-token-usage';

export interface UsageTokenUsageSourcesProps {
  className?: string;
  /** Per-request rows for the current selection (already provider-filtered server-side). */
  items: readonly UsageTokenUsageRowFragment[];
}

export const UsageTokenUsageSources = (
  props: UsageTokenUsageSourcesProps,
): React.ReactElement | null => {
  const { className, items } = props;

  // Hooks

  // Setup
  const groups = React.useMemo(() => groupTokenUsage(items, 'source'), [items]);
  const { sources: copy } = TOKEN_USAGE_COPY;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className={cn('mt-6', className)} data-testid="UsageTokenUsageSources">
      <GlobalHeading className="mb-3" heading="h3" title={copy.heading} />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.columnSource}</TableHead>
              <TableHead className="text-right">{copy.columnTurns}</TableHead>
              <TableHead className="text-right">{copy.columnInput}</TableHead>
              <TableHead className="text-right">{copy.columnOutput}</TableHead>
              <TableHead className="text-right">{copy.columnTotal}</TableHead>
              <TableHead className="text-right">{copy.columnCost}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow data-source={group.key} key={group.key}>
                <TableCell className="font-medium">
                  {tokenUsageSourceLabel(group.key)}
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
                  {group.pricedTurnCount === 0
                    ? '—'
                    : (formatUsageCost(group.costUsd) ?? '—')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
