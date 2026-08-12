import { describe, expect, test } from 'vitest';
import type { DashboardQueueStatsCardFragment } from '~/__generated__/graphql';
import { formatCompactSummary, formatQueueStatsTooltip } from './queue-stats';

const queue = (
  overrides: Partial<DashboardQueueStatsCardFragment> = {},
): DashboardQueueStatsCardFragment => ({
  __typename: 'QueueStatsObject',
  activeCount: 1,
  completedCount: 10,
  delayedCount: 0,
  failedCount: 0,
  name: 'default',
  waitingCount: 2,
  ...overrides,
});

describe('formatQueueStatsTooltip', () => {
  test('joins full labels and counts for every column', () => {
    expect(formatQueueStatsTooltip(queue())).toBe(
      'Waiting: 2, Active: 1, Completed: 10, Failed: 0, Delayed: 0',
    );
  });

  test('reflects updated counts', () => {
    expect(
      formatQueueStatsTooltip(
        queue({ activeCount: 0, completedCount: 0, waitingCount: 0 }),
      ),
    ).toBe('Waiting: 0, Active: 0, Completed: 0, Failed: 0, Delayed: 0');
  });
});

describe('formatCompactSummary', () => {
  test('formats compact single-letter summary', () => {
    expect(formatCompactSummary(queue())).toBe('W:2 A:1 C:10 F:0 D:0');
  });

  test('handles all-zero counts', () => {
    expect(
      formatCompactSummary(
        queue({
          activeCount: 0,
          completedCount: 0,
          delayedCount: 0,
          failedCount: 0,
          waitingCount: 0,
        }),
      ),
    ).toBe('W:0 A:0 C:0 F:0 D:0');
  });
});
