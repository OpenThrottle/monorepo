/**
 * @description Column definitions for {@link ScheduleTable}. Hoisted from the
 * component file per component-primitive-shape R4 (module-scope helpers live in
 * the sibling utils/ folder) so the table component stays UI-focused.
 */
import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { RUN_STATUS_COLOR } from '~/routing/schedule/data/data.run-status';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import { formatWhen } from '~/routing/schedule/utils/format-when';
import type { ColumnDef } from '@tanstack/react-table';
import type { ScheduleTableProps } from '~/routing/schedule/components/ScheduleTable';
import type { ScheduledJobCardFragment } from '~/__generated__/graphql';

export const buildScheduleTableColumns = (
  inFlightByJob: NonNullable<ScheduleTableProps['inFlightByJob']>,
): ColumnDef<
  ScheduledJobCardFragment,
  string | number | null | undefined
>[] => {
  return [
    {
      accessorKey: 'enabled',
      cell: ({ row }) => {
        const job = row.original;
        const inFlight = inFlightByJob[job.id] ?? 0;

        return (
          <div className="flex flex-wrap items-center gap-1 p-2">
            <Badge color={job.enabled ? 'green' : 'yellow'} size="xs">
              {job.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            {/* Additive, not a replacement: a disabled schedule with a
                manual run in flight is a real state, and hiding either half
                of it would misreport what the row is doing. */}
            {inFlight ? (
              <Badge color={RUN_STATUS_COLOR.running} variant="default">
                {SCHEDULE_COPY.tableRunningBadge}
                {inFlight > 1 ? ` ×${inFlight}` : ''}
              </Badge>
            ) : null}
          </div>
        );
      },
      header: () => <div className="p-2">Status</div>,
    },
    {
      accessorKey: 'details',
      cell: ({ row }) => (
        <div className="p-2">
          <Link
            className="font-medium underline-offset-4 hover:underline"
            to={`/schedule/${row.original.id}`}
            viewTransition={true}
          >
            {row.original.name}
          </Link>
        </div>
      ),
      header: () => <div className="p-2">Schedule Details</div>,
    },
    {
      accessorKey: 'driverId',
      cell: ({ row }) => (
        <div className="p-2">
          {row.original.driverId}
          {row.original.model ? ` · ${row.original.model}` : ''}
        </div>
      ),
      header: () => <div className="p-2">Provider</div>,
    },
    {
      accessorKey: 'cronPattern',
      cell: ({ row }) => (
        <div className="p-2 font-mono text-xs">
          {row.original.cronPattern}
          {row.original.timezone ? ` (${row.original.timezone})` : ''}
        </div>
      ),
      header: () => <div className="p-2">Schedule</div>,
    },
    {
      accessorKey: 'repository',
      cell: ({ row }) => (
        <div className="p-2">
          {row.original.repository?.displayName ??
            SCHEDULE_COPY.repositoryNoneOption}
        </div>
      ),
      header: () => (
        <div className="p-2">{SCHEDULE_COPY.repositoryColumnLabel}</div>
      ),
    },
    {
      accessorKey: 'nextRunAt',
      cell: ({ row }) => (
        <div className="p-2">{formatWhen(row.original.nextRunAt)}</div>
      ),
      header: () => <div className="p-2">Next run</div>,
    },
  ];
};
