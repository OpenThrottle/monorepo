import type { DashboardActivityCardFragment } from '~/__generated__/graphql';
import { describe, expect, test } from 'vitest';
import type { ActivityRow } from './recent-activity';
import {
  activityDetailHref,
  commitLinkAriaLabel,
  outputLinkAriaLabel,
  planCellContent,
  taskLinkAriaLabel,
  toActivityRows,
} from './recent-activity';

const baseData = (
  overrides: Partial<DashboardActivityCardFragment> = {},
): DashboardActivityCardFragment => ({
  commits: [],
  hasNext: false,
  outputChunks: [],
  tasksUpdated: [],
  totalCount: 0,
  ...overrides,
});

describe('toActivityRows', () => {
  test('maps commits, output chunks, and tasks updated into rows', () => {
    const data = baseData({
      commits: [
        {
          createdAt: '2026-01-01T00:00:00.000Z',
          id: 'commit-1',
          message: 'fix bug',
          planId: 'plan-1',
          planTitle: 'Plan One',
          repo: 'monorepo',
          sha: 'abcdef1234',
          taskId: 'task-1',
          taskTitle: 'Task One',
        },
      ],
      outputChunks: [
        {
          content: 'some output content',
          createdAt: '2026-01-02T00:00:00.000Z',
          id: 'output-1',
          iteration: 1,
          planId: 'plan-2',
          planTitle: 'Plan Two',
        },
      ],
      tasksUpdated: [
        {
          id: 'task-2',
          planId: 'plan-3',
          planTitle: 'Plan Three',
          status: 'COMPLETED',
          title: 'Task Two',
          updatedAt: '2026-01-03T00:00:00.000Z',
        },
      ],
    });

    const rows = toActivityRows(data);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ id: 'task-2', type: 'task' });
    expect(rows[1]).toMatchObject({ id: 'output-1', type: 'output' });
    expect(rows[2]).toMatchObject({ id: 'commit-1', type: 'commit' });
  });

  test('caps results at 20 rows, most recent first', () => {
    const commits = Array.from({ length: 25 }, (_unused, index) => ({
      createdAt: new Date(2026, 0, index + 1).toISOString(),
      id: `commit-${index}`,
      message: `message ${index}`,
      planId: `plan-${index}`,
      planTitle: `Plan ${index}`,
      repo: 'monorepo',
      sha: `sha${index}`,
      taskId: null,
      taskTitle: null,
    }));

    const rows = toActivityRows(baseData({ commits }));

    expect(rows).toHaveLength(20);
    expect(rows[0].id).toBe('commit-24');
  });

  test('defaults message and taskId/taskTitle to null/empty as needed', () => {
    const rows = toActivityRows(
      baseData({
        commits: [
          {
            createdAt: '2026-01-01T00:00:00.000Z',
            id: 'commit-1',
            message: null,
            planId: 'plan-1',
            planTitle: 'Plan One',
            repo: 'monorepo',
            sha: 'sha1',
            taskId: null,
            taskTitle: null,
          },
        ],
      }),
    );

    expect(rows[0]).toMatchObject({
      description: '',
      planTitle: 'Plan One',
      taskId: null,
      taskTitle: null,
    });
  });
});

describe('planCellContent', () => {
  const baseRow: ActivityRow = {
    date: '2026-01-01T00:00:00.000Z',
    description: '',
    id: 'row-1',
    planTitle: null,
    status: null,
    taskTitle: null,
    type: 'commit',
  };

  test('commit row joins repo and task title', () => {
    const row: ActivityRow = {
      ...baseRow,
      repo: 'monorepo',
      taskTitle: 'Fix the thing',
      type: 'commit',
    };

    expect(planCellContent(row)).toBe('monorepo — Fix the thing');
  });

  test('commit row falls back to description then sha', () => {
    const row: ActivityRow = {
      ...baseRow,
      description: 'some commit message',
      repo: 'monorepo',
      sha: 'abcdef1234567',
      type: 'commit',
    };

    expect(planCellContent(row)).toBe('monorepo — some commit message');
  });

  test('commit row with nothing returns em dash', () => {
    const row: ActivityRow = { ...baseRow, type: 'commit' };

    expect(planCellContent(row)).toBe('—');
  });

  test('output row shows plan title when present', () => {
    const row: ActivityRow = {
      ...baseRow,
      planTitle: 'Plan One',
      type: 'output',
    };

    expect(planCellContent(row)).toBe('Output: Plan One');
  });

  test('output row without plan title returns em dash', () => {
    const row: ActivityRow = { ...baseRow, type: 'output' };

    expect(planCellContent(row)).toBe('—');
  });

  test('task row joins plan title and description', () => {
    const row: ActivityRow = {
      ...baseRow,
      description: 'Task updated',
      planTitle: 'Plan One',
      type: 'task',
    };

    expect(planCellContent(row)).toBe('Plan One — Task updated');
  });

  test('task row with nothing returns em dash', () => {
    const row: ActivityRow = { ...baseRow, type: 'task' };

    expect(planCellContent(row)).toBe('—');
  });
});

describe('activityDetailHref', () => {
  const baseRow: ActivityRow = {
    date: '2026-01-01T00:00:00.000Z',
    description: '',
    id: 'row-1',
    planTitle: null,
    status: null,
    taskTitle: null,
    type: 'commit',
  };

  test('returns null when planId is missing', () => {
    expect(activityDetailHref(baseRow)).toBeNull();
  });

  test('returns plan path when planId present without taskId', () => {
    const row: ActivityRow = { ...baseRow, planId: 'plan-1' };

    expect(activityDetailHref(row)).toBe('/plans/plan-1');
  });

  test('returns task anchor when planId and taskId present', () => {
    const row: ActivityRow = {
      ...baseRow,
      planId: 'plan-1',
      taskId: 'task-1',
    };

    expect(activityDetailHref(row)).toBe('/plans/plan-1#task-task-1');
  });

  test('ignores empty-string taskId', () => {
    const row: ActivityRow = { ...baseRow, planId: 'plan-1', taskId: '' };

    expect(activityDetailHref(row)).toBe('/plans/plan-1');
  });
});

describe('commitLinkAriaLabel', () => {
  const baseRow: ActivityRow = {
    date: '2026-01-01T00:00:00.000Z',
    description: '',
    id: 'row-1',
    planTitle: null,
    status: null,
    taskTitle: null,
    type: 'commit',
  };

  test('labels task target with repo and title when taskId present', () => {
    const row: ActivityRow = {
      ...baseRow,
      repo: 'monorepo',
      taskId: 'task-1',
      taskTitle: 'Fix the thing',
    };

    expect(commitLinkAriaLabel(row)).toBe(
      'View task for monorepo: Fix the thing',
    );
  });

  test('labels plan target and falls back to truncated description', () => {
    const row: ActivityRow = {
      ...baseRow,
      description: 'a'.repeat(60),
    };

    expect(commitLinkAriaLabel(row)).toBe(`View plan: ${'a'.repeat(40)}`);
  });

  test('handles missing repo and context', () => {
    expect(commitLinkAriaLabel(baseRow)).toBe('View plan');
  });
});

describe('taskLinkAriaLabel', () => {
  test('truncates description to 50 chars', () => {
    const row: ActivityRow = {
      date: '2026-01-01T00:00:00.000Z',
      description: 'b'.repeat(60),
      id: 'row-1',
      planTitle: null,
      status: null,
      taskTitle: null,
      type: 'task',
    };

    expect(taskLinkAriaLabel(row)).toBe(`View task: ${'b'.repeat(50)}`);
  });

  test('falls back to generic label when description is empty', () => {
    const row: ActivityRow = {
      date: '2026-01-01T00:00:00.000Z',
      description: '',
      id: 'row-1',
      planTitle: null,
      status: null,
      taskTitle: null,
      type: 'task',
    };

    expect(taskLinkAriaLabel(row)).toBe('View task: task');
  });
});

describe('outputLinkAriaLabel', () => {
  test('includes plan title and truncated preview', () => {
    const row: ActivityRow = {
      date: '2026-01-01T00:00:00.000Z',
      description: 'c'.repeat(60),
      id: 'row-1',
      planTitle: 'Plan One',
      status: null,
      taskTitle: null,
      type: 'output',
    };

    expect(outputLinkAriaLabel(row)).toBe(
      `View plan Plan One: ${'c'.repeat(40)}`,
    );
  });

  test('falls back to generic plan label and empty preview', () => {
    const row: ActivityRow = {
      date: '2026-01-01T00:00:00.000Z',
      description: '',
      id: 'row-1',
      planTitle: null,
      status: null,
      taskTitle: null,
      type: 'output',
    };

    expect(outputLinkAriaLabel(row)).toBe('View plan plan');
  });
});
