import { describe, expect, test } from 'vitest';
import {
  getPlanTaskBoardColumnId,
  getPlanTaskBoardColumnTitle,
  groupPlanTasksByStatus,
  PLAN_TASK_BOARD_COLUMN_ORDER,
} from '../group-plan-tasks-by-status';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';

const baseTask = (): PlanTaskRowFragment => ({
  __typename: 'TaskObject',
  assignee: null,
  category: 'dev',
  createdAt: '2025-01-01T00:00:00Z',
  description: null,
  id: 't1',
  planId: 'p1',
  projectRelation: null,
  requirementsJson: '[]',
  status: 'PENDING',
  summary: null,
  title: 'A',
  updatedAt: '2025-01-02T00:00:00Z',
});

describe('groupPlanTasksByStatus', () => {
  test('places tasks in the column matching their status', () => {
    const tasks: PlanTaskRowFragment[] = [
      { ...baseTask(), id: 'a', status: 'PENDING' },
      { ...baseTask(), id: 'b', status: 'IN_PROGRESS' },
      { ...baseTask(), id: 'c', status: 'COMPLETED' },
    ];

    const grouped = groupPlanTasksByStatus(tasks);

    expect(grouped.get('PENDING')?.map((t) => t.id)).toEqual(['a']);
    expect(grouped.get('IN_PROGRESS')?.map((t) => t.id)).toEqual(['b']);
    expect(grouped.get('COMPLETED')?.map((t) => t.id)).toEqual(['c']);
  });

  test('routes unknown status strings to UNKNOWN', () => {
    const tasks: PlanTaskRowFragment[] = [
      { ...baseTask(), id: 'x', status: 'NOT_A_REAL_STATUS' },
    ];

    const grouped = groupPlanTasksByStatus(tasks);

    expect(grouped.get('UNKNOWN')?.map((t) => t.id)).toEqual(['x']);
  });

  test('initializes every ordered column with an empty array', () => {
    const grouped = groupPlanTasksByStatus([]);

    for (const key of PLAN_TASK_BOARD_COLUMN_ORDER) {
      expect(grouped.get(key)).toEqual([]);
    }
    expect(grouped.get('UNKNOWN')).toEqual([]);
  });
});

describe('getPlanTaskBoardColumnTitle', () => {
  test('returns Other for UNKNOWN', () => {
    expect(getPlanTaskBoardColumnTitle('UNKNOWN')).toBe('Other');
  });

  test('returns plan status label for known keys', () => {
    expect(getPlanTaskBoardColumnTitle('PENDING')).toBe('Pending');
  });
});

describe('getPlanTaskBoardColumnId', () => {
  test('returns lowercase snake for enum keys', () => {
    expect(getPlanTaskBoardColumnId('IN_PROGRESS')).toBe('in_progress');
  });

  test('returns unknown for UNKNOWN', () => {
    expect(getPlanTaskBoardColumnId('UNKNOWN')).toBe('unknown');
  });
});
