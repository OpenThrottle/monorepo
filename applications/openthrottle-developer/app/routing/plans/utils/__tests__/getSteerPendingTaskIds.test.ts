import { describe, expect, test } from 'vitest';

import type {
  PlanInboxMessageFragment,
  PlanTaskRowFragment,
} from '~/__generated__/graphql';

import { getSteerPendingTaskIds } from '../getSteerPendingTaskIds';

const message = (
  overrides: Partial<PlanInboxMessageFragment>,
): PlanInboxMessageFragment => {
  return {
    author: 'visormatt',
    body: 'body',
    createdAt: '2026-11-03T00:00:00Z',
    deliveredAt: null,
    deliveredToTaskId: null,
    id: 'm1',
    kind: 'STEER',
    planId: 'p1',
    status: 'PENDING',
    taskId: 't1',
    updatedAt: '2026-11-03T00:00:00Z',
    ...overrides,
  };
};

const task = (id: string, status: string): PlanTaskRowFragment => {
  return {
    assignee: null,
    category: null,
    createdAt: '2026-11-03T00:00:00Z',
    description: null,
    hookRole: null,
    id,
    planId: 'p1',
    projectRelation: null,
    requirementsJson: '[]',
    sortOrder: 1000,
    status,
    summary: null,
    title: id,
    updatedAt: '2026-11-03T00:00:00Z',
    wave: null,
  };
};

describe('getSteerPendingTaskIds', () => {
  const tasks = [task('t1', 'IN_PROGRESS'), task('t2', 'PENDING')];

  test('flags an in-progress task with a pending steer', () => {
    expect([...getSteerPendingTaskIds([message({})], tasks)]).toEqual(['t1']);
  });

  test('ignores queue messages, delivered or withdrawn steers, and untargeted steers', () => {
    const ids = getSteerPendingTaskIds(
      [
        message({ id: 'a', kind: 'QUEUE' }),
        message({ id: 'b', status: 'DELIVERED' }),
        message({ id: 'c', status: 'WITHDRAWN' }),
        message({ id: 'd', taskId: null }),
      ],
      tasks,
    );

    expect(ids.size).toBe(0);
  });

  test('ignores a task that is not in progress', () => {
    expect(
      getSteerPendingTaskIds([message({ taskId: 't2' })], tasks).size,
    ).toBe(0);
  });
});
