import { describe, expect, test } from 'vitest';
import type { QueueCardFragment } from '~/__generated__/graphql';
import { backlogForQueue, queuesToStatsChartData } from '../queue-stats-chart';

const queue = (
  overrides: Partial<QueueCardFragment> & Pick<QueueCardFragment, 'name'>,
): QueueCardFragment => ({
  __typename: 'QueueStatsObject',
  activeCount: 0,
  completedCount: 0,
  delayedCount: 0,
  failedCount: 0,
  waitingCount: 0,
  ...overrides,
});

describe('backlogForQueue', () => {
  test('sums waiting and delayed counts', () => {
    expect(
      backlogForQueue(
        queue({ delayedCount: 3, name: 'alpha', waitingCount: 5 }),
      ),
    ).toBe(8);
  });

  test('returns zero when both counts are zero', () => {
    expect(backlogForQueue(queue({ name: 'idle' }))).toBe(0);
  });
});

describe('queuesToStatsChartData', () => {
  test('returns empty array when queues is empty', () => {
    expect(queuesToStatsChartData([])).toEqual([]);
  });

  test('maps each queue to all count series', () => {
    const queues = [
      queue({
        activeCount: 2,
        completedCount: 100,
        delayedCount: 1,
        failedCount: 3,
        name: 'default',
        waitingCount: 5,
      }),
      queue({ name: 'notifications' }),
    ];

    expect(queuesToStatsChartData(queues)).toEqual([
      {
        active: 2,
        completed: 100,
        delayed: 1,
        failed: 3,
        name: 'default',
        waiting: 5,
      },
      {
        active: 0,
        completed: 0,
        delayed: 0,
        failed: 0,
        name: 'notifications',
        waiting: 0,
      },
    ]);
  });

  test('sorts by total jobs descending, then name ascending', () => {
    const queues = [
      queue({ completedCount: 1, name: 'z-queue' }),
      queue({ completedCount: 50, name: 'a-queue' }),
      queue({ completedCount: 10, name: 'm-queue', waitingCount: 5 }),
    ];

    expect(queuesToStatsChartData(queues).map((row) => row.name)).toEqual([
      'a-queue',
      'm-queue',
      'z-queue',
    ]);
  });

  test('does not mutate the input array', () => {
    const queues = [
      queue({ name: 'b', waitingCount: 1 }),
      queue({ name: 'a', waitingCount: 2 }),
    ];
    const copy = [...queues];

    queuesToStatsChartData(queues);

    expect(queues).toEqual(copy);
  });
});
