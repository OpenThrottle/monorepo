import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  DataTable,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import classnames from 'classnames';
import type { QueueCardFragment } from '~/__generated__/graphql';

export interface QueuesTableProps {
  readonly className?: string;
  readonly queues: QueueCardFragment[];
}

function queueDetailHref(name: string): string {
  return `/queues/${encodeURIComponent(name)}`;
}

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
          <h2 className="text-sm line-clamp-1 text-ellipsis font-medium">
            <Link
              aria-label={`View queue: ${displayName}`}
              className="underline underline-offset-2 hover:text-primary"
              to={href}
              viewTransition={true}
            >
              {displayName}
            </Link>
          </h2>
        </div>
      );
    },
    header: () => <div className="p-4 py-2">Name</div>,
  },
  {
    accessorKey: 'waitingCount',
    cell: ({ row }) => (
      <span
        aria-label={`${row.original.waitingCount} waiting`}
        className="tabular-nums"
      >
        {row.original.waitingCount}
      </span>
    ),
    header: () => 'Waiting',
  },
  {
    accessorKey: 'activeCount',
    cell: ({ row }) => (
      <span
        aria-label={`${row.original.activeCount} active`}
        className="tabular-nums"
      >
        {row.original.activeCount}
      </span>
    ),
    header: () => 'Active',
  },
  {
    accessorKey: 'completedCount',
    cell: ({ row }) => (
      <span
        aria-label={`${row.original.completedCount} completed`}
        className="tabular-nums"
      >
        {row.original.completedCount}
      </span>
    ),
    header: () => 'Completed',
  },
  {
    accessorKey: 'delayedCount',
    cell: ({ row }) => (
      <span
        aria-label={`${row.original.delayedCount} delayed`}
        className="tabular-nums"
      >
        {row.original.delayedCount}
      </span>
    ),
    header: () => 'Delayed',
  },
  {
    accessorKey: 'failedCount',
    cell: ({ row }) => {
      const count = row.original.failedCount;
      return count > 0 ? (
        <Badge aria-label={`${count} failed`} size="sm" variant="destructive">
          {count}
        </Badge>
      ) : (
        <span aria-label="0 failed" className="tabular-nums">
          {count}
        </span>
      );
    },
    header: () => 'Failed',
  },
  {
    cell: ({ row }) => {
      const queue = row.original;
      const href = queueDetailHref(queue.name);
      return (
        <Button asChild={true} className="text-xs" size="xs" variant="outline">
          <Link to={href} viewTransition={true}>
            View
          </Link>
        </Button>
      );
    },
    header: () => 'Actions',
    id: 'actions',
  },
];

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
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          No queues yet.
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
      />
    </div>
  );
};
