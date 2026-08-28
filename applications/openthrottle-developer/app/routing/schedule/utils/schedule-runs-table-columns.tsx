/**
 * @description Column definitions for {@link ScheduleRunsTable}. Hoisted from the
 * component file per component-primitive-shape R4 (module-scope helpers live in
 * the sibling utils/ folder) so the table component stays UI-focused.
 */
import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import {
  RUN_STATUS_COLOR,
  RUN_STATUS_LABEL,
  RUN_STATUS_VARIANT,
} from '~/routing/schedule/data/data.run-status';
import { formatDuration } from '~/routing/schedule/utils/format-duration';
import {
  formatRunCost,
  formatRunTotalTokens,
  runUsageTooltip,
} from '~/routing/schedule/utils/format-usage';
import { formatWhen } from '~/routing/schedule/utils/format-when';
import type { ColumnDef } from '@tanstack/react-table';
import type { ScheduledJobRunRowFragment } from '~/__generated__/graphql';
import type { ScheduleRunsTableProps } from '~/routing/schedule/components/ScheduleRunsTable';

export const buildScheduleRunsTableColumns = (
  jobId: ScheduleRunsTableProps['jobId'],
): ColumnDef<
  ScheduledJobRunRowFragment,
  string | number | null | undefined
>[] => {
  return [
    {
      accessorKey: 'status',
      cell: ({ row }) => {
        const run = row.original;

        return (
          <div className="p-2">
            <Badge
              color={RUN_STATUS_COLOR[run.status] ?? 'default'}
              title={run.errorMessage ?? undefined}
              variant={RUN_STATUS_VARIANT[run.status] ?? 'outline'}
            >
              {RUN_STATUS_LABEL[run.status] ?? run.status}
            </Badge>
          </div>
        );
      },
      header: () => <div className="p-2">Status</div>,
    },
    {
      accessorKey: 'trigger',
      cell: ({ row }) => <div className="p-2">{row.original.trigger}</div>,
      header: () => <div className="p-2">Trigger</div>,
    },
    {
      accessorKey: 'model',
      cell: ({ row }) => (
        <div className="p-2 font-mono text-xs">{row.original.model ?? '—'}</div>
      ),
      header: () => <div className="p-2">Model</div>,
    },
    {
      accessorKey: 'startedAt',
      cell: ({ row }) => (
        <div className="p-2">{formatWhen(row.original.startedAt)}</div>
      ),
      header: () => <div className="p-2">Started</div>,
    },
    {
      accessorKey: 'finishedAt',
      cell: ({ row }) => (
        <div className="p-2">{formatWhen(row.original.finishedAt)}</div>
      ),
      header: () => <div className="p-2">Finished</div>,
    },
    {
      cell: ({ row }) => (
        <div className="p-2">
          {formatDuration(row.original.startedAt, row.original.finishedAt)}
        </div>
      ),
      header: () => <div className="p-2">Duration</div>,
      id: 'duration',
    },
    {
      accessorKey: 'totalTokens',
      cell: ({ row }) => (
        <div
          className="p-2 text-right tabular-nums"
          title={runUsageTooltip(row.original)}
        >
          {formatRunTotalTokens(row.original)}
        </div>
      ),
      header: () => <div className="p-2 text-right">Tokens</div>,
    },
    {
      accessorKey: 'costUsd',
      cell: ({ row }) => (
        <div className="p-2 text-right tabular-nums">
          {formatRunCost(row.original)}
        </div>
      ),
      header: () => <div className="p-2 text-right">Cost</div>,
    },
    {
      accessorKey: 'exitCode',
      cell: ({ row }) => (
        <div className="p-2">{row.original.exitCode ?? '—'}</div>
      ),
      header: () => <div className="p-2">Exit</div>,
    },
    {
      cell: ({ row }) => (
        <div className="p-2 text-right">
          <Link
            className="text-primary text-sm underline-offset-4 hover:underline"
            to={`/schedule/${jobId}/runs/${row.original.id}`}
            viewTransition={true}
          >
            View
          </Link>
        </div>
      ),
      header: () => (
        <div className="p-2">
          <span className="sr-only">Open run</span>
        </div>
      ),
      id: 'actions',
    },
  ];
};
