import { describe, expect, test } from 'vitest';
import type { QueueCardFragment } from '~/__generated__/graphql';
import {
  backlogForQueue,
  queuesToBacklogChartData,
} from '../queue-backlog-chart';

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

describe('queuesToBacklogChartData', () => {
  test('returns empty array when queues is empty', () => {
    expect(queuesToBacklogChartData([])).toEqual([]);
  });

  test('maps each queue to name and backlog', () => {
    const queues = [
      queue({ delayedCount: 1, name: 'default', waitingCount: 4 }),
      queue({ name: 'notifications' }),
    ];

    expect(queuesToBacklogChartData(queues)).toEqual([
      { backlog: 5, name: 'default' },
      { backlog: 0, name: 'notifications' },
    ]);
  });

  test('sorts by backlog descending, then name ascending', () => {
    const queues = [
      queue({ name: 'z-queue', waitingCount: 1 }),
      queue({ name: 'a-queue', waitingCount: 10 }),
      queue({ delayedCount: 2, name: 'm-queue', waitingCount: 3 }),
    ];

    expect(queuesToBacklogChartData(queues).map((row) => row.name)).toEqual([
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

    queuesToBacklogChartData(queues);

    expect(queues).toEqual(copy);
  });
});
