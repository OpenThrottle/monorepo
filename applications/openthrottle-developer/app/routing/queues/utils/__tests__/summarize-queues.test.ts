import { describe, expect, test } from 'vitest';
import type { QueueCardFragment } from '~/__generated__/graphql';
import { summarizeQueues } from '../summarize-queues';

const queue = (
  overrides: Partial<QueueCardFragment> & { name: string },
): QueueCardFragment => ({
  __typename: 'QueueStatsObject',
  activeCount: 0,
  completedCount: 0,
  delayedCount: 0,
  failedCount: 0,
  waitingCount: 0,
  ...overrides,
});

describe('summarizeQueues', () => {
  test('returns all zeros for no queues', () => {
    expect(summarizeQueues([])).toEqual({
      backlog: 0,
      completed: 0,
      failed: 0,
      inFlight: 0,
    });
  });

  test('sums backlog (waiting + delayed), in-flight, failed and completed across queues', () => {
    const result = summarizeQueues([
      queue({
        activeCount: 2,
        completedCount: 100,
        delayedCount: 3,
        failedCount: 1,
        name: 'a',
        waitingCount: 5,
      }),
      queue({
        activeCount: 1,
        completedCount: 40,
        delayedCount: 0,
        failedCount: 4,
        name: 'b',
        waitingCount: 7,
      }),
    ]);

    expect(result).toEqual({
      backlog: 15,
      completed: 140,
      failed: 5,
      inFlight: 3,
    });
  });
});
