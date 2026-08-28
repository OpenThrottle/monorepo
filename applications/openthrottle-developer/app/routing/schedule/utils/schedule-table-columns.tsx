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
import {
  GlobalPopover,
  GlobalPopoverActionsHeader,
} from '@openthrottle/react-router-ui-global';
import type { ColumnDef } from '@tanstack/react-table';
import type { ScheduleTableProps } from '~/routing/schedule/components/ScheduleTable';
import type { ScheduledJobCardFragment } from '~/__generated__/graphql';
// import { formatWhen } from '~/routing/schedule/utils/format-when';
// import { RepositoryRowActions } from '~/routing/settings/repositories/components/RepositoryRowActions';

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
      cell: ({ row }) => {
        const { cronPattern = '', repository, timezone } = row.original;
        const repo =
          repository?.displayName ?? SCHEDULE_COPY.repositoryNoneOption;

        return (
          <div className="space-y-4 p-2">
            <Link
              className="block font-medium underline-offset-4 hover:underline"
              to={`/schedule/${row.original.id}`}
              viewTransition={true}
            >
              {row.original.name}
            </Link>

            <div className="text-muted-foreground space-y-1">
              <div>
                <b>Cron Pattern:</b> {cronPattern}
              </div>
              <div>
                <b>Repository:</b> {repo}
              </div>
              <div>
                <b>Timezone:</b> {timezone ?? 'Pacific Time (US & Canada)'}
              </div>
            </div>
          </div>
        );
      },
      header: () => <div className="p-2">Schedule Details</div>,
    },
    {
      accessorKey: 'driverId',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge color="blue" size="xs">
            {row.original.driverId}
          </Badge>
          <span>·</span>
          <span>{row.original.model ? `${row.original.model}` : `auto`}</span>
        </div>
      ),
      header: () => <div className="p-2">Driver · Model</div>,
    },
    // {
    //   accessorKey: 'nextRunAt',
    //   cell: ({ row }) => (
    //     <div className="p-2">{formatWhen(row.original.nextRunAt)}</div>
    //   ),
    //   header: () => <div className="p-2">Next run</div>,
    // },
    {
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <GlobalPopover
            actions={[
              {
                id: `schedule-actions-${row.original.id}`,
                kind: 'link',
                label: 'Edit',
                to: `/schedule/${row.original.id}`,
              },
            ]}
            ariaLabel="Schedule actions"
          />
        </div>
      ),
      header: () => <GlobalPopoverActionsHeader />,
      id: 'actions',
    },
  ];
};
