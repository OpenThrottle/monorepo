import { describe, expect, test } from 'vitest';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import {
  comparePlanTasksByListOrder,
  sortPlanTasksByListOrder,
} from '../sort-plan-tasks-by-list-order';

const baseTask = (
  overrides: Partial<PlanTaskRowFragment>,
): PlanTaskRowFragment => ({
  __typename: 'TaskObject',
  assignee: null,
  category: null,
  createdAt: '2025-01-01T00:00:00Z',
  description: null,
  id: 'task-id',
  planId: 'plan-id',
  projectRelation: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  summary: null,
  title: 'Task',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('comparePlanTasksByListOrder', () => {
  test('orders by sortOrder ascending', () => {
    const low = baseTask({ id: 'a', sortOrder: 1000 });
    const high = baseTask({ id: 'b', sortOrder: 2000 });

    expect(comparePlanTasksByListOrder(low, high)).toBeLessThan(0);
    expect(comparePlanTasksByListOrder(high, low)).toBeGreaterThan(0);
  });

  test('uses createdAt as tiebreaker when sortOrder matches', () => {
    const earlier = baseTask({
      createdAt: '2025-01-01T00:00:00Z',
      id: 'a',
      sortOrder: 1000,
    });
    const later = baseTask({
      createdAt: '2025-01-02T00:00:00Z',
      id: 'b',
      sortOrder: 1000,
    });

    expect(comparePlanTasksByListOrder(earlier, later)).toBeLessThan(0);
  });
});

describe('sortPlanTasksByListOrder', () => {
  test('returns a new array sorted by sortOrder then createdAt', () => {
    const tasks = [
      baseTask({ createdAt: '2025-01-03T00:00:00Z', id: 'c', sortOrder: 3000 }),
      baseTask({ createdAt: '2025-01-01T00:00:00Z', id: 'a', sortOrder: 1000 }),
      baseTask({ createdAt: '2025-01-02T00:00:00Z', id: 'b', sortOrder: 2000 }),
    ];

    expect(sortPlanTasksByListOrder(tasks).map((task) => task.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});
