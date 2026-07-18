import { describe, expect, it } from 'vitest';
import {
  comparePlanTaskListOrder,
  isRunnableRalphTask,
  isRunnerExecutedHookTask,
  pickRalphTaskForIteration,
  sortTasksByPlanListOrder,
} from '../plan-task-list-order.ts';

const task = (
  id: string,
  sortOrder: number,
  createdAt: string,
  status: string,
) => ({
  createdAt,
  id,
  sortOrder,
  status,
  title: id,
});

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

describe('pickRalphTaskForIteration', () => {
  it('prefers lowest sortOrder PENDING over earlier createdAt', () => {
    const tasks = [
      task('older-first', 2000, '2026-01-01T00:00:00.000Z', 'PENDING'),
      task('intended-next', 1000, '2026-01-02T00:00:00.000Z', 'PENDING'),
    ];

    expect(pickRalphTaskForIteration(tasks)?.id).toBe('intended-next');
  });

  it('resumes lowest sortOrder IN_PROGRESS before PENDING', () => {
    const tasks = [
      task('pending', 1000, '2026-01-01T00:00:00.000Z', 'PENDING'),
      task('in-progress', 2000, '2026-01-02T00:00:00.000Z', 'IN_PROGRESS'),
    ];

    expect(pickRalphTaskForIteration(tasks)?.id).toBe('in-progress');
  });

  it('picks lowest sortOrder among multiple IN_PROGRESS tasks', () => {
    const tasks = [
      task(
        'later-in-progress',
        3000,
        '2026-01-01T00:00:00.000Z',
        'IN_PROGRESS',
      ),
      task('resume-me', 1000, '2026-01-02T00:00:00.000Z', 'IN_PROGRESS'),
    ];

    expect(pickRalphTaskForIteration(tasks)?.id).toBe('resume-me');
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

describe('isRunnableRalphTask', () => {
  it('keeps regular remaining tasks', () => {
    expect(isRunnableRalphTask({ status: 'PENDING' })).toBe(true);
    expect(isRunnableRalphTask({ status: 'IN_PROGRESS' })).toBe(true);
  });

  it('drops terminal tasks', () => {
    expect(isRunnableRalphTask({ status: 'COMPLETED' })).toBe(false);
  });

  it('drops runner-executed plan-level skill hook-tasks even when remaining', () => {
    expect(
      isRunnableRalphTask({
        hookRole: 'before',
        hookSource: 'skill',
        parentTaskId: null,
        status: 'QUEUED',
      }),
    ).toBe(false);
  });

  it('keeps task-level and template hook-tasks (they run as materialized tasks)', () => {
    expect(
      isRunnableRalphTask({
        hookRole: 'before',
        hookSource: 'skill',
        parentTaskId: 'anchor-1',
        status: 'QUEUED',
      }),
    ).toBe(true);
    expect(
      isRunnableRalphTask({
        hookRole: 'after',
        hookSource: 'template',
        parentTaskId: null,
        status: 'PENDING',
      }),
    ).toBe(true);
  });
});
