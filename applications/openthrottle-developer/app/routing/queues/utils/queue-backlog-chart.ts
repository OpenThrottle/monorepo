import type { QueueCardFragment } from '~/__generated__/graphql';

/** One row for {@link SimpleLineChart}: queue name (X) and backlog (Y). */
export interface QueueBacklogChartDatum {
  readonly backlog: number;
  readonly name: string;
}

/**
 * @description Waiting + delayed jobs — same semantics as the queues table backlog column.
 */
export function backlogForQueue(queue: QueueCardFragment): number {
  return queue.waitingCount + queue.delayedCount;
}

/**
 * @description Maps queue stats to chart rows, sorted by backlog descending then name for a stable X axis.
 */
export function queuesToBacklogChartData(
  queues: ReadonlyArray<QueueCardFragment>,
): QueueBacklogChartDatum[] {
  return [...queues]
    .map((queue) => ({
      backlog: backlogForQueue(queue),
      name: queue.name,
    }))
    .sort((a, b) => {
      if (b.backlog !== a.backlog) {
        return b.backlog - a.backlog;
      }
      return a.name.localeCompare(b.name);
    });
}
