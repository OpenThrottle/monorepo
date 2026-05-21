import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  DataTable,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import { Link } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import classnames from 'classnames';
import type { QueueCardFragment } from '~/__generated__/graphql';
import { backlogForQueue } from '~/routing/queues/utils/queue-stats-chart';

interface QueuesTableProps {
  readonly className?: string;
  readonly queues: QueueCardFragment[];
}

function queueDetailHref(name: string): string {
  return `/queues/${encodeURIComponent(name)}`;
}

const queueRowId = (queue: QueueCardFragment, _index: number): string =>
  queue.name;

export const QueuesTable = (props: QueuesTableProps) => {
  const { className, queues } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (queues.length === 0) {
    return (
      <Card className={classnames(className)} data-testid="QueuesTable">
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center sm:p-10">
          <OpenThrottleEmptyState
            description="When workers register Bull queues with the API, they appear here with live backlog, in-flight, and outcome counts."
            title="No queues"
          />
        </div>
      </Card>
    );
  }

  return (
    <div
      className={classnames('border ui-border rounded-lg', className)}
      data-testid="QueuesTable"
    >
      <DataTable<QueueCardFragment, string | number | undefined>
        columns={queuesTableColumns}
        data={queues}
        getRowId={queueRowId}
      />
    </div>
  );
};

const queuesTableColumns: ColumnDef<
  QueueCardFragment,
  string | number | undefined
>[] = [
  {
    accessorKey: 'name',
    cell: ({ row }) => {
      const queue = row.original;
      const href = queueDetailHref(queue.name);
      const displayName = queue.name || 'Unnamed';

      return (
        <div className="overflow-hidden p-4 py-2">
          <div className="text-sm font-medium leading-tight text-foreground">
            <Link
              aria-label={`View queue: ${displayName}`}
              className="line-clamp-1 text-ellipsis underline underline-offset-2 hover:text-primary"
              to={href}
              viewTransition={true}
            >
              {displayName}
            </Link>
          </div>
        </div>
      );
    },
    header: () => (
      <div className="p-4 py-2">
        <div className="text-sm font-medium">Queue</div>
        <p className="mt-0.5 text-xs font-normal text-muted-foreground">
          Name and drill-down
        </p>
      </div>
    ),
  },
  {
    accessorFn: (row) => backlogForQueue(row),
    cell: ({ row }) => {
      const queue = row.original;
      const backlog = backlogForQueue(queue);
      const label = `Backlog: ${backlog} total (${queue.waitingCount} waiting, ${queue.delayedCount} delayed)`;

      return (
        <div className="text-right tabular-nums">
          <span aria-label={label} title={label}>
            {backlog}
          </span>
          <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
            {queue.waitingCount} wait · {queue.delayedCount} delayed
          </span>
        </div>
      );
    },
    header: () => (
      <div className="py-2 text-right" title="Waiting plus delayed jobs">
        <div className="text-sm font-medium">Backlog</div>
        <p className="mt-0.5 text-xs font-normal text-muted-foreground">
          waiting + delayed
        </p>
      </div>
    ),
    id: 'backlog',
  },
  {
    accessorKey: 'activeCount',
    cell: ({ row }) => {
      const n = row.original.activeCount;
      const label = `${n} in flight`;

      return (
        <div className="text-right tabular-nums">
          <span aria-label={label} title="Jobs currently processing">
            {n}
          </span>
        </div>
      );
    },
    header: () => (
      <div className="py-2 text-right" title="Jobs currently processing">
        <div className="text-sm font-medium">In flight</div>
        <p className="mt-0.5 text-xs font-normal text-muted-foreground">
          active workers
        </p>
      </div>
    ),
    id: 'inFlight',
  },
  {
    accessorKey: 'completedCount',
    cell: ({ row }) => {
      const n = row.original.completedCount;

      return (
        <div className="text-right tabular-nums">
          <span aria-label={`${n} completed`}>{n}</span>
        </div>
      );
    },
    header: () => (
      <div className="py-2 text-right">
        <div className="text-sm font-medium">Completed</div>
        <p className="mt-0.5 text-xs font-normal text-muted-foreground">
          finished OK
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'failedCount',
    cell: ({ row }) => {
      const count = row.original.failedCount;

      return (
        <div className="text-right">
          {count > 0 ? (
            <Badge
              aria-label={`${count} failed`}
              className="tabular-nums"
              size="sm"
              title="Jobs that failed or exceeded retries"
              variant="destructive"
            >
              {count}
            </Badge>
          ) : (
            <span
              aria-label="0 failed"
              className="tabular-nums text-muted-foreground"
            >
              {count}
            </span>
          )}
        </div>
      );
    },
    header: () => (
      <div
        className="py-2 text-right"
        title="Jobs that failed or exceeded retries"
      >
        <div className="text-sm font-medium">Failed</div>
        <p className="mt-0.5 text-xs font-normal text-muted-foreground">
          needs attention
        </p>
      </div>
    ),
  },
  {
    cell: ({ row }) => {
      const queue = row.original;
      const href = queueDetailHref(queue.name);
      const displayName = queue.name || 'Unnamed';

      return (
        <div className="flex justify-end py-1 pr-2">
          <Button
            asChild={true}
            className="text-xs"
            size="xs"
            variant="outline"
          >
            <Link
              aria-label={`View queue details for ${displayName}`}
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
      <div className="py-2 text-right">
        <span className="text-sm font-medium">Actions</span>
      </div>
    ),
    id: 'actions',
  },
];
