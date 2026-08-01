import * as React from 'react';
import { Button, Card } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { ArrowRightIcon } from 'lucide-react';
import clsx from 'clsx';
import type { DashboardQueueStatsCardFragment } from '~/__generated__/graphql';
import { QueueHealthPill } from '~/routing/queues/components/QueueHealthPill';
import { QUEUE_HEALTH_RANK } from '~/routing/queues/data/queue-health-display';
import { computeQueueHealth } from '~/routing/queues/utils/queue-health';

const TOP_QUEUES = 6;

export interface DashboardQueueHealthCardProps {
  className?: string;
  queues: DashboardQueueStatsCardFragment[];
}

/**
 * @description Dashboard queue-health card: the queues most in need of attention (by health,
 * then failed, then backlog), each linking into its detail route, plus a link to the full ops console.
 */
export const DashboardQueueHealthCard = (
  props: DashboardQueueHealthCardProps,
): React.ReactElement => {
  const { className, queues } = props;

  // Hooks

  // Setup
  const ranked = React.useMemo(() => {
    return queues
      .map((queue) => ({
        health: computeQueueHealth({
          activeCount: queue.activeCount,
          delayedCount: queue.delayedCount,
          failedCount: queue.failedCount,
          waitingCount: queue.waitingCount,
        }),
        queue,
      }))
      .sort((a, b) => {
        const rankDiff =
          QUEUE_HEALTH_RANK[a.health.level] - QUEUE_HEALTH_RANK[b.health.level];
        if (rankDiff !== 0) return rankDiff;
        if (a.queue.failedCount !== b.queue.failedCount) {
          return b.queue.failedCount - a.queue.failedCount;
        }
        if (a.health.backlog !== b.health.backlog) {
          return b.health.backlog - a.health.backlog;
        }
        return a.queue.name.localeCompare(b.queue.name);
      })
      .slice(0, TOP_QUEUES);
  }, [queues]);

  const isEmpty = queues.length === 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={clsx('gap-3 p-4', className)}
      data-testid="DashboardQueueHealthCard"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Queue health</h2>
        <Button asChild={true} size="xs" variant="ghost">
          <Link to="/queues" viewTransition={true}>
            View all <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {isEmpty ? (
        <p className="text-muted-foreground py-4 text-center text-sm">
          No queues registered yet.
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {ranked.map(({ health, queue }) => (
            <li
              className="flex items-center justify-between gap-2 py-2"
              key={queue.name}
            >
              <Link
                className="hover:text-primary min-w-0 flex-1 truncate text-sm font-medium underline-offset-2 hover:underline"
                to={`/queues/${encodeURIComponent(queue.name)}`}
                viewTransition={true}
              >
                {queue.name}
              </Link>
              <span
                className="text-muted-foreground shrink-0 text-xs tabular-nums"
                title={`${queue.failedCount} failed, ${health.backlog} in backlog`}
              >
                {queue.failedCount} failed · {health.backlog} backlog
              </span>
              <QueueHealthPill
                activeCount={queue.activeCount}
                className="shrink-0"
                delayedCount={queue.delayedCount}
                failedCount={queue.failedCount}
                showLabel={false}
                waitingCount={queue.waitingCount}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
