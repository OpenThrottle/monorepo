/**
 * @description Column definitions (and their row-id / formatting helpers) for
 * the queue-detail jobs table. Hoisted out of QueueJobsTable per
 * component-primitive-shape R4 so the component stays UI-focused.
 */

import * as React from 'react';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router';
import type { GetQueueQuery } from '~/__generated__/graphql';
import { QueueStateBadge } from '~/routing/queues/components/QueueStateBadge';
import { parseQueueJobDataString } from '~/routing/queues/utils/parse-queue-job-data';
import { queueJobDetailPath } from '~/routing/queues/utils/queue-job-detail-path';

const JOB_ID_DISPLAY_MAX = 24;
const FAILED_REASON_MAX = 72;

export type QueueJobsTableJob = NonNullable<
  NonNullable<GetQueueQuery['queue']>['jobs']
>['jobs'][number];

const truncateText = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}…`;

const formatTs = (unix?: number | null): string => {
  if (unix == null) return '—';
  return new Date(unix).toISOString();
};

export const queueJobRowId = (job: QueueJobsTableJob): string => job.id;

export function buildQueueJobsTableColumns(
  queueName: string,
): ColumnDef<QueueJobsTableJob, string | number | null | undefined>[] {
  return [
    {
      accessorKey: 'state',
      cell: ({ row }) => {
        const job = row.original;

        return (
          <div className="px-3 py-2">
            <QueueStateBadge
              data-testid={`job-state-${job.id}`}
              state={job.state}
            />
          </div>
        );
      },
      header: () => (
        <div className="px-3 py-2">
          <div className="text-sm font-medium">State</div>
        </div>
      ),
      id: 'state',
    },
    {
      accessorKey: 'id',
      cell: ({ row }) => {
        const job = row.original;
        const detailHref = queueJobDetailPath(queueName, job.id);
        const displayId = truncateText(job.id, JOB_ID_DISPLAY_MAX);

        return (
          <div className="min-w-0 px-3 py-2">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  className="text-primary block font-mono text-xs underline-offset-2 hover:underline"
                  data-testid={`job-id-link-${job.id}`}
                  title={job.id}
                  to={detailHref}
                  viewTransition={true}
                >
                  {displayId}
                </Link>
                {job.name != null && job.name !== '' && (
                  <p
                    className="text-muted-foreground mt-0.5 line-clamp-1 text-xs"
                    title={job.name}
                  >
                    {job.name}
                  </p>
                )}
              </div>
              <OpenThrottleClipboard
                className="h-7 shrink-0 text-xs"
                label="Copy id"
                text={job.id}
              />
            </div>
          </div>
        );
      },
      header: () => (
        <div className="px-3 py-2">
          <div className="text-sm font-medium">Job</div>
          <p className="text-muted-foreground mt-0.5 text-xs font-normal">
            Job id and name
          </p>
        </div>
      ),
      id: 'job',
    },
    {
      cell: ({ row }) => {
        const job = row.original;
        const parsed = parseQueueJobDataString(job.data);

        if (parsed.planId == null || parsed.planId === '') {
          return (
            <span className="text-muted-foreground px-3 py-2 text-xs">—</span>
          );
        }

        return (
          <div className="min-w-0 space-y-0.5 px-3 py-2 text-xs">
            <Link
              className="text-primary line-clamp-1 font-mono underline-offset-2 hover:underline"
              data-testid={`queue-jobs-table-plan-${job.id}`}
              title={parsed.planId}
              to={`/plans/${parsed.planId}`}
              viewTransition={true}
            >
              {truncateText(parsed.planId, JOB_ID_DISPLAY_MAX)}
            </Link>
            {parsed.taskId != null && parsed.taskId !== '' && (
              <Link
                className="text-muted-foreground hover:text-primary line-clamp-1 font-mono underline-offset-2 hover:underline"
                data-testid={`queue-jobs-table-task-${job.id}`}
                title={parsed.taskId}
                to={`/plans/${parsed.planId}/tasks/${parsed.taskId}`}
                viewTransition={true}
              >
                {truncateText(parsed.taskId, JOB_ID_DISPLAY_MAX)}
              </Link>
            )}
          </div>
        );
      },
      header: () => (
        <div className="px-3 py-2">
          <div className="text-sm font-medium">Plan / task</div>
        </div>
      ),
      id: 'planTask',
    },
    {
      cell: ({ row }) => {
        const parsed = parseQueueJobDataString(row.original.data);
        const runLabel = [parsed.runKind, parsed.mode]
          .filter((part) => part != null && part !== '')
          .join(' · ');

        return (
          <span
            className="text-muted-foreground block max-w-[10rem] truncate px-3 py-2 text-xs"
            title={runLabel || undefined}
          >
            {runLabel !== '' ? runLabel : '—'}
          </span>
        );
      },
      header: () => (
        <div className="px-3 py-2">
          <div className="text-sm font-medium">Run</div>
          <p className="text-muted-foreground mt-0.5 text-xs font-normal">
            kind · mode
          </p>
        </div>
      ),
      id: 'run',
    },
    {
      accessorFn: (row) => row.timestamp,
      cell: ({ row }) => (
        <span className="text-muted-foreground block px-3 py-2 font-mono text-[11px] whitespace-nowrap tabular-nums">
          {formatTs(row.original.timestamp)}
        </span>
      ),
      header: () => (
        <div className="px-3 py-2">
          <div className="text-sm font-medium">Created</div>
        </div>
      ),
      id: 'created',
    },
    {
      accessorFn: (row) => row.finishedOn,
      cell: ({ row }) => (
        <span className="text-muted-foreground block px-3 py-2 font-mono text-[11px] whitespace-nowrap tabular-nums">
          {formatTs(row.original.finishedOn)}
        </span>
      ),
      header: () => (
        <div className="px-3 py-2">
          <div className="text-sm font-medium">Finished</div>
        </div>
      ),
      id: 'finished',
    },
    {
      accessorKey: 'failedReason',
      cell: ({ row }) => {
        const reason = row.original.failedReason;
        if (reason == null || reason === '') {
          return (
            <span className="text-muted-foreground px-3 py-2 text-xs">—</span>
          );
        }

        const display = truncateText(reason, FAILED_REASON_MAX);

        return (
          <p
            className="text-destructive max-w-[14rem] px-3 py-2 text-xs break-words"
            data-testid={`job-failedReason-${row.original.id}`}
            title={reason}
          >
            {display}
          </p>
        );
      },
      header: () => (
        <div className="px-3 py-2">
          <div className="text-sm font-medium">Failed</div>
          <p className="text-muted-foreground mt-0.5 text-xs font-normal">
            reason
          </p>
        </div>
      ),
      id: 'failedReason',
    },
  ];
}
