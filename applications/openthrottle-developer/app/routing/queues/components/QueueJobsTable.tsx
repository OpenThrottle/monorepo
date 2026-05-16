import * as React from 'react';
import { Badge, Button, DataTable } from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import type { ColumnDef } from '@tanstack/react-table';
import classnames from 'classnames';
import { Link } from 'react-router';
import type { GetQueueQuery } from '~/__generated__/graphql';
import { parseQueueJobDataString } from '~/routing/queues/utils/parse-queue-job-data';
import { queueJobDetailPath } from '~/routing/queues/utils/queue-job-detail-path';

const JOB_ID_DISPLAY_MAX = 24;
const FAILED_REASON_MAX = 72;

const JOB_STATE_BADGE_VARIANT: Record<
  string,
  'default' | 'destructive' | 'outline' | 'secondary'
> = {
  active: 'default',
  completed: 'secondary',
  delayed: 'outline',
  failed: 'destructive',
  waiting: 'outline',
};

export type QueueJobsTableJob = NonNullable<
  NonNullable<GetQueueQuery['queue']>['jobs']
>['jobs'][number];

export interface QueueJobsTableProps {
  readonly className?: string;
  readonly jobs: readonly QueueJobsTableJob[];
  readonly queueName: string;
}

const truncateText = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}…`;

const formatTs = (unix?: number | null): string => {
  if (unix == null) return '—';
  return new Date(unix).toISOString();
};

const queueJobRowId = (job: QueueJobsTableJob): string => job.id;

/**
 * @description Dense, scannable jobs table for queue detail index; drill-down via job detail route.
 */
export const QueueJobsTable = (
  props: QueueJobsTableProps,
): React.ReactElement => {
  const { className, jobs, queueName } = props;

  const columns = React.useMemo(
    () => buildQueueJobsTableColumns(queueName),
    [queueName],
  );

  return (
    <div
      className={classnames('border ui-border rounded-lg', className)}
      data-testid="QueueJobsTable"
    >
      <DataTable<QueueJobsTableJob, string | number | null | undefined>
        columns={columns}
        data={[...jobs]}
        getRowId={queueJobRowId}
      />
    </div>
  );
};

function buildQueueJobsTableColumns(
  queueName: string,
): ColumnDef<QueueJobsTableJob, string | number | null | undefined>[] {
  return [
    {
      accessorKey: 'state',
      cell: ({ row }) => {
        const job = row.original;

        return (
          <div className="px-3 py-2">
            <Badge
              data-testid={`job-state-${job.id}`}
              size="sm"
              variant={JOB_STATE_BADGE_VARIANT[job.state] ?? 'default'}
            >
              {job.state}
            </Badge>
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
                  className="block font-mono text-xs text-primary underline-offset-2 hover:underline"
                  data-testid={`job-id-link-${job.id}`}
                  title={job.id}
                  to={detailHref}
                  viewTransition={true}
                >
                  {displayId}
                </Link>
                {job.name != null && job.name !== '' && (
                  <p
                    className="mt-0.5 line-clamp-1 text-xs text-muted-foreground"
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
          <p className="mt-0.5 text-xs font-normal text-muted-foreground">
            BullMQ id and name
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
            <span className="px-3 py-2 text-xs text-muted-foreground">—</span>
          );
        }

        return (
          <div className="min-w-0 space-y-0.5 px-3 py-2 text-xs">
            <Link
              className="line-clamp-1 font-mono text-primary underline-offset-2 hover:underline"
              data-testid={`queue-jobs-table-plan-${job.id}`}
              title={parsed.planId}
              to={`/plans/${parsed.planId}`}
              viewTransition={true}
            >
              {truncateText(parsed.planId, JOB_ID_DISPLAY_MAX)}
            </Link>
            {parsed.taskId != null && parsed.taskId !== '' && (
              <Link
                className="line-clamp-1 font-mono text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
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
            className="block max-w-[10rem] truncate px-3 py-2 text-xs text-muted-foreground"
            title={runLabel || undefined}
          >
            {runLabel !== '' ? runLabel : '—'}
          </span>
        );
      },
      header: () => (
        <div className="px-3 py-2">
          <div className="text-sm font-medium">Run</div>
          <p className="mt-0.5 text-xs font-normal text-muted-foreground">
            kind · mode
          </p>
        </div>
      ),
      id: 'run',
    },
    {
      accessorFn: (row) => row.timestamp,
      cell: ({ row }) => (
        <span className="block whitespace-nowrap px-3 py-2 font-mono text-[11px] text-muted-foreground tabular-nums">
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
        <span className="block whitespace-nowrap px-3 py-2 font-mono text-[11px] text-muted-foreground tabular-nums">
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
            <span className="px-3 py-2 text-xs text-muted-foreground">—</span>
          );
        }

        const display = truncateText(reason, FAILED_REASON_MAX);

        return (
          <p
            className="max-w-[14rem] px-3 py-2 text-xs text-destructive break-words"
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
          <p className="mt-0.5 text-xs font-normal text-muted-foreground">
            reason
          </p>
        </div>
      ),
      id: 'failedReason',
    },
    {
      cell: ({ row }) => {
        const job = row.original;
        const href = queueJobDetailPath(queueName, job.id);

        return (
          <div className="flex justify-end px-2 py-1">
            <Button
              asChild={true}
              className="text-xs"
              size="xs"
              variant="outline"
            >
              <Link
                aria-label={`View job details for ${job.id}`}
                data-testid={`job-detail-link-${job.id}`}
                to={href}
                viewTransition={true}
              >
                View
              </Link>
            </Button>
          </div>
        );
      },
      header: () => (
        <div className="py-2 pr-2 text-right">
          <span className="text-sm font-medium">Actions</span>
        </div>
      ),
      id: 'actions',
    },
  ];
}
