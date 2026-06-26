import { describe, expect, it } from 'vitest';
import { formatPlanAndTasksForPrompt } from './index.ts';

const PLAN_ID = '9207a6b7-4de7-4e06-8d10-779503b497ae';
const TASK_ID = '2e53b3d4-13db-4137-8c01-3331f9fd8fea';
const ISO = '2026-06-08T12:00:00.000Z';

const basePlan = () => ({
  __typename: 'PlanObject' as const,
  assignee: null,
  author: 'visormatt',
  category: 'infra',
  createdAt: ISO,
  description: 'Plan description',
  id: PLAN_ID,
  project: null,
  projectId: null,
  status: 'IN_PROGRESS',
  summary: null,
  title: 'Test plan',
  updatedAt: ISO,
});

const baseTask = (
  overrides: {
    readonly createdAt?: string;
    readonly description?: string | null;
    readonly id?: string;
    readonly requirements?: unknown[];
    readonly requirementsJson?: string;
    readonly sortOrder?: number;
    readonly status?: string;
    readonly title?: string;
  } = {},
) => ({
  __typename: 'TaskObject' as const,
  assignee: null,
  category: null,
  createdAt: ISO,
  description: 'Task description',
  id: TASK_ID,
  planId: PLAN_ID,
  project: null,
  projectId: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  summary: null,
  title: 'Test task',
  updatedAt: ISO,
  ...overrides,
});

describe('formatPlanAndTasksForPrompt', () => {
  it('emits Requirements line when requirementsJson has entries', () => {
    const output = formatPlanAndTasksForPrompt(basePlan(), [
      baseTask({
        requirementsJson: JSON.stringify(['alpha', 'beta']),
      }),
    ]);

    expect(output).toContain('    Requirements: alpha, beta');
  });

  it('emits Requirements line when requirements array has entries', () => {
    const output = formatPlanAndTasksForPrompt(basePlan(), [
      baseTask({
        requirements: ['from entity field'],
      }),
    ]);

    expect(output).toContain('    Requirements: from entity field');
  });

  it('omits Requirements line when requirementsJson is empty', () => {
    const output = formatPlanAndTasksForPrompt(basePlan(), [baseTask()]);

    expect(output).not.toContain('Requirements:');
  });

  it('omits Requirements line when requirementsJson is invalid JSON', () => {
    const output = formatPlanAndTasksForPrompt(basePlan(), [
      baseTask({ requirementsJson: 'not-json' }),
    ]);

    expect(output).not.toContain('Requirements:');
  });

  it('places Requirements line immediately after the task description', () => {
    const output = formatPlanAndTasksForPrompt(basePlan(), [
      baseTask({
        description: 'Do the work',
        requirementsJson: JSON.stringify(['must match reference format']),
      }),
    ]);

    expect(output).toContain('    Do the work');
    expect(output).toContain('    Requirements: must match reference format');

    const taskBlockStart = output.indexOf('  - ');
    const taskBlock = output.slice(taskBlockStart, output.indexOf('\n---'));

    expect(taskBlock).toMatch(
      /Do the work\n {4}Requirements: must match reference format/,
    );
  });
});
