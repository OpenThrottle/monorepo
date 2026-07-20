import { describe, expect, it } from 'vitest';
import type {
  PlanFragment,
  TaskFragment,
} from '../../__generated__/graphql.js';
import { formatPlanAndTasksForPrompt } from '../index.js';

const plan = (): PlanFragment => ({
  __typename: 'PlanObject',
  assignee: null,
  author: 'visormatt',
  category: 'improvement',
  createdAt: '2026-01-01T00:00:00.000Z',
  description: null,
  id: 'plan-1',
  jobRunHooksJson: '[]',
  project: null,
  projectId: null,
  status: 'IN_PROGRESS',
  summary: null,
  title: 'Test plan',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const task = (
  overrides: Partial<TaskFragment> & Pick<TaskFragment, 'id'>,
): TaskFragment => ({
  __typename: 'TaskObject',
  assignee: null,
  category: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  description: null,
  planId: 'plan-1',
  project: null,
  projectId: null,
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  summary: null,
  title: overrides.id,
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('formatPlanAndTasksForPrompt', () => {
  it('renders a valid JSON array of requirements', () => {
    const output = formatPlanAndTasksForPrompt(plan(), [
      task({ id: 'a', requirementsJson: '["alpha", "beta"]' }),
    ]);

    expect(output).toContain('Requirements: alpha, beta');
  });

  it('does not throw and skips the line when requirementsJson is invalid JSON', () => {
    const build = () =>
      formatPlanAndTasksForPrompt(plan(), [
        task({ id: 'bad', requirementsJson: 'not json' }),
      ]);

    expect(build).not.toThrow();
    expect(build()).not.toContain('Requirements:');
  });

  it('does not throw and skips the line when requirementsJson is a non-array', () => {
    const build = () =>
      formatPlanAndTasksForPrompt(plan(), [
        task({ id: 'obj', requirementsJson: '{"foo":"bar"}' }),
      ]);

    expect(build).not.toThrow();
    expect(build()).not.toContain('Requirements:');
  });

  it('renders other tasks even when one row has a malformed requirementsJson', () => {
    const output = formatPlanAndTasksForPrompt(plan(), [
      task({ id: 'good', requirementsJson: '["ok"]', sortOrder: 1000 }),
      task({ id: 'broken', requirementsJson: '%%%', sortOrder: 2000 }),
    ]);

    expect(output).toContain('good');
    expect(output).toContain('broken');
    expect(output).toContain('Requirements: ok');
  });

  it('renders requirements from a TypeORM-style entity `requirements` array (no requirementsJson)', () => {
    // The server lifecycle / job-run hooks pass entity rows whose requirements
    // live in a parsed array, not a GraphQL `requirementsJson` string.
    const output = formatPlanAndTasksForPrompt(plan(), [
      {
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        description: null,
        id: 'entity',
        requirements: ['gamma', 'delta'],
        sortOrder: 1000,
        status: 'PENDING',
        title: 'entity',
      },
    ]);

    expect(output).toContain('Requirements: gamma, delta');
  });

  it('sorts entity rows with a Date createdAt by sortOrder without throwing', () => {
    const build = () =>
      formatPlanAndTasksForPrompt(plan(), [
        {
          createdAt: new Date('2026-02-01T00:00:00.000Z'),
          id: 'second',
          requirements: [],
          sortOrder: 2000,
          status: 'PENDING',
          title: 'second',
        },
        {
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          id: 'first',
          requirements: [],
          sortOrder: 1000,
          status: 'PENDING',
          title: 'first',
        },
      ]);

    expect(build).not.toThrow();

    const output = build();

    expect(output.indexOf('first')).toBeLessThan(output.indexOf('second'));
  });
});
