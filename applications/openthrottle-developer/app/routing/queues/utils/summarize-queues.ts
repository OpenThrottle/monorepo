import type { QueueCardFragment } from '~/__generated__/graphql';

export interface QueuesSummary {
  readonly backlog: number;
  readonly completed: number;
  readonly failed: number;
  readonly inFlight: number;
}

/**
 * @description Rolls per-queue counts into cross-queue totals for the list dashboard: backlog (waiting + delayed), in-flight (active), failed, and completed.
 */
export const summarizeQueues = (
  queues: readonly QueueCardFragment[],
): QueuesSummary =>
  queues.reduce<QueuesSummary>(
    (acc, queue) => ({
      backlog: acc.backlog + queue.waitingCount + queue.delayedCount,
      completed: acc.completed + queue.completedCount,
      failed: acc.failed + queue.failedCount,
      inFlight: acc.inFlight + queue.activeCount,
    }),
    { backlog: 0, completed: 0, failed: 0, inFlight: 0 },
  );
