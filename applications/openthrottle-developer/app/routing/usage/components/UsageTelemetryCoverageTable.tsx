import { formatRelativeChatTimestamp } from '@openthrottle/react-router-chat';
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
import { GlobalPopoverActionsHeader } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type { UsageTelemetryCoverageMachineFragment } from '~/__generated__/graphql';
import {
  TELEMETRY_COVERAGE_COPY,
  TELEMETRY_DELIVERY_LEGS,
} from '~/routing/usage/data/data.telemetry-coverage-copy';
import {
  countMachineWarnings,
  deliveryLegLabel,
  hasDeliveryLeg,
  machineDisplayName,
  pluginDisplay,
} from '~/routing/usage/utils/telemetry-coverage';

import { UsageTelemetryCoverageRowDetails } from './UsageTelemetryCoverageRowDetails';

export interface UsageTelemetryCoverageTableProps {
  readonly className?: string;
  readonly machines: readonly UsageTelemetryCoverageMachineFragment[];
  /** Loader clock (ISO), so relative labels match across SSR and hydration. */
  readonly nowIso: string;
}

export const UsageTelemetryCoverageTable = (
  props: UsageTelemetryCoverageTableProps,
): React.ReactElement => {
  const { className, machines, nowIso } = props;

  // Hooks

  // Setup
  const nowMs = new Date(nowIso).getTime();
  const copy = TELEMETRY_COVERAGE_COPY;

  // Handlers
  const relative = (iso: string): string => {
    return formatRelativeChatTimestamp(iso, nowMs);
  };

  const bufferLabel = (
    machine: UsageTelemetryCoverageMachineFragment,
  ): string => {
    const { oldestBufferedAt, totalBuffered } = machine.buffer;

    if (totalBuffered === 0) {
      return copy.bufferEmpty;
    }

    if (oldestBufferedAt === null) {
      return copy.bufferTotal(totalBuffered);
    }

    return copy.bufferOldest(totalBuffered, relative(oldestBufferedAt));
  };

  const statusLabel = (warningCount: number): string => {
    if (warningCount > 0) {
      return copy.statusWarnings(warningCount);
    }

    return copy.statusOk;
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('overflow-x-auto', className)}
      data-testid="UsageTelemetryCoverageTable"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{copy.columnMachine}</TableHead>
            <TableHead>{copy.columnLastSeen}</TableHead>
            <TableHead>{copy.columnPlugin}</TableHead>
            <TableHead>{copy.columnDelivery}</TableHead>
            <TableHead>{copy.columnRepos}</TableHead>
            <TableHead>{copy.columnBuffer}</TableHead>
            <TableHead>{copy.columnStatus}</TableHead>
            <TableHead>
              <GlobalPopoverActionsHeader />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {machines.map((machine) => {
            const warningCount = countMachineWarnings(machine);

            return (
              <TableRow
                data-testid="UsageTelemetryCoverageRow"
                key={machine.machineId}
              >
                <TableCell className="font-mono text-xs">
                  {machineDisplayName(machine)}
                </TableCell>
                <TableCell className="tabular-nums">
                  <time dateTime={machine.lastSeenAt}>
                    {relative(machine.lastSeenAt)}
                  </time>
                </TableCell>
                <TableCell>{pluginDisplay(machine)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {TELEMETRY_DELIVERY_LEGS.filter((leg) =>
                      hasDeliveryLeg(machine, leg),
                    ).map((leg) => (
                      <Badge
                        data-testid="UsageTelemetryCoverageLeg"
                        key={leg}
                        variant="secondary"
                      >
                        {deliveryLegLabel(leg)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">
                  {machine.repos.length}
                </TableCell>
                <TableCell className="text-xs">
                  <div>{bufferLabel(machine)}</div>
                  {machine.buffer.deadLetterCount > 0 && (
                    <div className="text-destructive">
                      {copy.bufferDeadLetter(machine.buffer.deadLetterCount)}
                    </div>
                  )}
                </TableCell>
                <TableCell
                  className={cn(warningCount > 0 && 'text-destructive')}
                  data-testid="UsageTelemetryCoverageStatus"
                >
                  {statusLabel(warningCount)}
                </TableCell>
                <TableCell>
                  <UsageTelemetryCoverageRowDetails
                    machine={machine}
                    nowIso={nowIso}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
