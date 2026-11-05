import {
  formatTokenCount,
  formatUsageCost,
} from '@openthrottle/react-router-chat';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { TokenUsageGroup } from '~/routing/usage/utils/aggregate-token-usage';
import { tokenUsageProviderLabel } from '~/routing/usage/utils/token-usage-labels';

export interface UsageTokenUsageTableProps {
  readonly groups: readonly TokenUsageGroup[];
  /** True when rows are broken down by provider, false when by model. */
  readonly isByProvider: boolean;
}

/**
 * @description Token-usage breakdown table: one row per provider (all
 * providers selected) or per model (a single provider selected).
 */
export const UsageTokenUsageTable = (
  props: UsageTokenUsageTableProps,
): React.ReactElement => {
  const { groups, isByProvider } = props;

  // Hooks

  // Setup
  const breakdownLabel = isByProvider ? 'Provider' : 'Model';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
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
          {groups.map((group) => {
            const providerLabel = tokenUsageProviderLabel(group.key);
            const groupLabel = isByProvider ? providerLabel : group.key;
            const hasPricedTurns = group.pricedTurnCount > 0;
            const costLabel = formatUsageCost(group.costUsd) ?? '—';

            return (
              <TableRow key={group.key}>
                <TableCell className="font-medium">{groupLabel}</TableCell>
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
                  {hasPricedTurns ? costLabel : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
