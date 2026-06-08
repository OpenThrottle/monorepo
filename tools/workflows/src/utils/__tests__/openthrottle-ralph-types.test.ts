/**
 * @description Tests for Ralph plan/task row types and prompt formatting helpers.
 */

import { describe, expect, it } from 'vitest';
import {
  formatPlanAndTasksForPrompt,
  type PlanRow,
  type TaskRow,
} from '../openthrottle-ralph-types';

const PLAN_ID = '9207a6b7-4de7-4e06-8d10-779503b497ae';
const TASK_ID = '45a2adf6-b915-45d1-9537-03d51873341c';
const ISO = '2026-06-08T12:00:00.000Z';

const basePlan = (overrides: Partial<PlanRow> = {}): PlanRow => ({
  author: 'visormatt',
  category: 'infra',
  createdAt: ISO,
  description: 'Plan description',
  id: PLAN_ID,
  status: 'IN_PROGRESS',
  summary: null,
  title: 'Test plan',
  updatedAt: ISO,
  ...overrides,
});

const baseTask = (overrides: Partial<TaskRow> = {}): TaskRow => ({
  category: null,
  createdAt: ISO,
  description: 'Task description',
  id: TASK_ID,
  planId: PLAN_ID,
  requirements: [],
  sortOrder: 1000,
  status: 'PENDING',
  title: 'Test task',
  updatedAt: ISO,
  ...overrides,
});

describe('formatPlanAndTasksForPrompt', () => {
  it('emits Requirements line when task has non-empty requirements', () => {
    const output = formatPlanAndTasksForPrompt(basePlan(), [
      baseTask({
        requirements: ['first requirement', 'second requirement'],
      }),
    ]);

    expect(output).toContain(
      '    Requirements: first requirement, second requirement',
    );
  });

  it('omits Requirements line when task requirements array is empty', () => {
    const output = formatPlanAndTasksForPrompt(basePlan(), [baseTask()]);

    expect(output).not.toContain('Requirements:');
  });

  it('places Requirements line immediately after the task description', () => {
    const output = formatPlanAndTasksForPrompt(basePlan(), [
      baseTask({
        description: 'Do the work',
        requirements: ['must match reference format'],
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
