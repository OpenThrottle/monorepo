/**
 * @description Column definitions for the queues overview table (name
 * drill-down, health, backlog, in-flight, completed, failed, per-row ops
 * controls). Hoisted out of QueuesTable per component-primitive-shape R4.
 */

import * as React from 'react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontalIcon, PauseIcon, PlayIcon } from 'lucide-react';
import { Link } from 'react-router';
import type { QueueCardFragment } from '~/__generated__/graphql';
import { QueueHealthPill } from '~/routing/queues/components/QueueHealthPill';
import { backlogForQueue } from '~/routing/queues/utils/queue-stats-chart';
import { queueDetailHref } from '~/routing/queues/utils/queues-table';

export type QueueControlIntent = 'pauseQueue' | 'resumeQueue';

export function buildQueuesTableColumns(
  onControl: (queueName: string, intent: QueueControlIntent) => void,
): ColumnDef<QueueCardFragment, string | number | undefined>[] {
  return [
    {
      accessorKey: 'name',
      cell: ({ row }) => {
        const queue = row.original;
        const href = queueDetailHref(queue.name);
        const displayName = queue.name || 'Unnamed';

        return (
          <div className="overflow-hidden p-4 py-2">
            <div className="text-foreground text-sm leading-tight font-medium">
              <Link
                aria-label={`View queue: ${displayName}`}
                className="hover:text-primary line-clamp-1 text-ellipsis underline underline-offset-2"
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
          <p className="text-muted-foreground mt-0.5 text-xs font-normal">
            Name and drill-down
          </p>
        </div>
      ),
    },
    {
      cell: ({ row }) => {
        const queue = row.original;

        return (
          <div className="px-3 py-2">
            <QueueHealthPill
              activeCount={queue.activeCount}
              data-testid={`queue-health-${queue.name}`}
              delayedCount={queue.delayedCount}
              failedCount={queue.failedCount}
              waitingCount={queue.waitingCount}
            />
          </div>
        );
      },
      header: () => (
        <div className="px-3 py-2" title="Failed jobs plus backlog">
          <div className="text-sm font-medium">Health</div>
          <p className="text-muted-foreground mt-0.5 text-xs font-normal">
            status rollup
          </p>
        </div>
      ),
      id: 'health',
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
            <span className="text-muted-foreground mt-0.5 block text-[11px] font-normal">
              {queue.waitingCount} wait · {queue.delayedCount} delayed
            </span>
          </div>
        );
      },
      header: () => (
        <div className="py-2 text-right" title="Waiting plus delayed jobs">
          <div className="text-sm font-medium">Backlog</div>
          <p className="text-muted-foreground mt-0.5 text-xs font-normal">
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
          <p className="text-muted-foreground mt-0.5 text-xs font-normal">
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
          <p className="text-muted-foreground mt-0.5 text-xs font-normal">
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
                className="text-muted-foreground tabular-nums"
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
          <p className="text-muted-foreground mt-0.5 text-xs font-normal">
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
          <div className="flex items-center justify-end gap-1 py-1 pr-2">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild={true}>
                <Button
                  aria-label={`Queue controls for ${displayName}`}
                  size="xs"
                  variant="ghost"
                >
                  <MoreHorizontalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Queue controls</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => onControl(queue.name, 'pauseQueue')}
                >
                  <PauseIcon className="h-4 w-4" /> Pause queue
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onControl(queue.name, 'resumeQueue')}
                >
                  <PlayIcon className="h-4 w-4" /> Resume queue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
}
