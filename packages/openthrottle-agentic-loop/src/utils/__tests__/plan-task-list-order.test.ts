import { describe, expect, it } from 'vitest';

import {
  comparePlanTaskListOrder,
  isRunnablePlanTask,
  isRunnerExecutedHookTask,
  sortTasksByPlanListOrder,
} from '../plan-task-list-order.ts';

const task = (
  id: string,
  sortOrder: number,
  createdAt: string,
  status: string,
) => {
  return {
    createdAt,
    id,
    sortOrder,
    status,
    title: id,
  };
};

describe('comparePlanTaskListOrder', () => {
  it('orders by sortOrder ascending', () => {
    const a = task('a', 2000, '2026-01-02T00:00:00.000Z', 'PENDING');
    const b = task('b', 1000, '2026-01-01T00:00:00.000Z', 'PENDING');

    expect(comparePlanTaskListOrder(a, b)).toBeGreaterThan(0);
    expect(comparePlanTaskListOrder(b, a)).toBeLessThan(0);
  });

  it('uses createdAt as tiebreaker when sortOrder matches', () => {
    const earlier = task('a', 1000, '2026-01-01T00:00:00.000Z', 'PENDING');
    const later = task('b', 1000, '2026-01-02T00:00:00.000Z', 'PENDING');

    expect(comparePlanTaskListOrder(earlier, later)).toBeLessThan(0);
  });
});

describe('sortTasksByPlanListOrder', () => {
  it('sorts tasks by sortOrder then createdAt', () => {
    const tasks = [
      task('c', 3000, '2026-01-01T00:00:00.000Z', 'PENDING'),
      task('a', 1000, '2026-01-03T00:00:00.000Z', 'PENDING'),
      task('b', 2000, '2026-01-02T00:00:00.000Z', 'PENDING'),
    ];

    expect(sortTasksByPlanListOrder(tasks).map((t) => t.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('isRunnerExecutedHookTask', () => {
  it('is true only for a plan-level skill hook (parentTaskId null, source skill)', () => {
    expect(
      isRunnerExecutedHookTask({
        hookRole: 'before',
        hookSource: 'skill',
        parentTaskId: null,
      }),
    ).toBe(true);
  });

  it('is false for task-level skill hooks (anchored)', () => {
    expect(
      isRunnerExecutedHookTask({
        hookRole: 'before',
        hookSource: 'skill',
        parentTaskId: 'anchor-1',
      }),
    ).toBe(false);
  });

  it('is false for plan-level template hooks and regular tasks', () => {
    expect(
      isRunnerExecutedHookTask({
        hookRole: 'after',
        hookSource: 'template',
        parentTaskId: null,
      }),
    ).toBe(false);
    expect(isRunnerExecutedHookTask({ hookRole: null })).toBe(false);
  });
});

describe('isRunnablePlanTask', () => {
  it('keeps regular remaining tasks', () => {
    expect(isRunnablePlanTask({ status: 'PENDING' })).toBe(true);
    expect(isRunnablePlanTask({ status: 'IN_PROGRESS' })).toBe(true);
  });

  it('drops terminal tasks', () => {
    expect(isRunnablePlanTask({ status: 'COMPLETED' })).toBe(false);
  });

  it('drops runner-executed plan-level skill hook-tasks even when remaining', () => {
    expect(
      isRunnablePlanTask({
        hookRole: 'before',
        hookSource: 'skill',
        parentTaskId: null,
        status: 'QUEUED',
      }),
    ).toBe(false);
  });

  it('keeps task-level and template hook-tasks (they run as materialized tasks)', () => {
    expect(
      isRunnablePlanTask({
        hookRole: 'before',
        hookSource: 'skill',
        parentTaskId: 'anchor-1',
        status: 'QUEUED',
      }),
    ).toBe(true);
    expect(
      isRunnablePlanTask({
        hookRole: 'after',
        hookSource: 'template',
        parentTaskId: null,
        status: 'PENDING',
      }),
    ).toBe(true);
  });
});
