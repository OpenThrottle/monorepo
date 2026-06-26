/**
 * @description Unit tests for the pure `filterTasksByCategory` helper:
 * category/status case-insensitivity, planId scoping, and the limit-slice edge.
 */

import { describe, expect, it } from 'vitest';
import type { TaskListItem } from '../tools/tasks.js';
import { filterTasksByCategory } from './filters.js';

const makeTask = (overrides: Partial<TaskListItem>): TaskListItem => ({
  assignee: null,
  category: 'infra',
  createdAt: '2026-06-25T00:00:00.000Z',
  description: null,
  id: 'task-id',
  planId: 'plan-a',
  project: null,
  projectId: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  summary: null,
  title: 'A task',
  updatedAt: '2026-06-25T00:00:00.000Z',
  ...overrides,
});

describe('filterTasksByCategory', () => {
  it('matches category case-insensitively', () => {
    const tasks = [
      makeTask({ category: 'Infra', id: '1' }),
      makeTask({ category: 'DOCS', id: '2' }),
    ];

    const result = filterTasksByCategory(tasks, 'infra');

    expect(result.map((t) => t.id)).toEqual(['1']);
  });

  it('treats a null category as a non-match (empty-string fallback)', () => {
    const tasks = [
      makeTask({ category: null, id: '1' }),
      makeTask({ category: 'infra', id: '2' }),
    ];

    const result = filterTasksByCategory(tasks, 'infra');

    expect(result.map((t) => t.id)).toEqual(['2']);
  });

  it('scopes to planId when provided', () => {
    const tasks = [
      makeTask({ id: '1', planId: 'plan-a' }),
      makeTask({ id: '2', planId: 'plan-b' }),
    ];

    const result = filterTasksByCategory(tasks, 'infra', 'plan-b');

    expect(result.map((t) => t.id)).toEqual(['2']);
  });

  it('matches status case-insensitively when provided', () => {
    const tasks = [
      makeTask({ id: '1', status: 'IN_PROGRESS' }),
      makeTask({ id: '2', status: 'PENDING' }),
    ];

    const result = filterTasksByCategory(
      tasks,
      'infra',
      undefined,
      'in_progress',
    );

    expect(result.map((t) => t.id)).toEqual(['1']);
  });

  it('slices to the limit when a positive limit is given', () => {
    const tasks = [
      makeTask({ id: '1' }),
      makeTask({ id: '2' }),
      makeTask({ id: '3' }),
    ];

    const result = filterTasksByCategory(
      tasks,
      'infra',
      undefined,
      undefined,
      2,
    );

    expect(result.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('ignores a non-positive limit', () => {
    const tasks = [makeTask({ id: '1' }), makeTask({ id: '2' })];

    const result = filterTasksByCategory(
      tasks,
      'infra',
      undefined,
      undefined,
      0,
    );

    expect(result.map((t) => t.id)).toEqual(['1', '2']);
  });
});
