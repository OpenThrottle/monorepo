import { describe, expect, test } from 'vitest';
import type { QueueCardFragment } from '~/__generated__/graphql';
import { queueDetailHref, queueRowId } from '../queues-table';

const queue = (
  overrides: Partial<QueueCardFragment> = {},
): QueueCardFragment => ({
  __typename: 'QueueStatsObject',
  activeCount: 0,
  completedCount: 0,
  delayedCount: 0,
  failedCount: 0,
  name: 'default',
  waitingCount: 0,
  ...overrides,
});

describe('queueDetailHref', () => {
  test('builds a detail href for a simple name', () => {
    expect(queueDetailHref('agentic-runs')).toBe('/queues/agentic-runs');
  });

  test('URL-encodes special characters in the name', () => {
    expect(queueDetailHref('queue name/with slash')).toBe(
      '/queues/queue%20name%2Fwith%20slash',
    );
  });
});

describe('queueRowId', () => {
  test('returns the queue name as the row id', () => {
    expect(queueRowId(queue({ name: 'my-queue' }), 0)).toBe('my-queue');
  });

  test('ignores the index argument', () => {
    expect(queueRowId(queue({ name: 'other-queue' }), 7)).toBe('other-queue');
  });
});
