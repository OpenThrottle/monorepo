import { describe, expect, it } from 'vitest';

import { formatPlanAndTasksForPrompt } from '../formatPlanAndTasksForPrompt.ts';

type PlanInput = Parameters<typeof formatPlanAndTasksForPrompt>[0];
type TaskInput = Parameters<typeof formatPlanAndTasksForPrompt>[1][number];

const plan = (): PlanInput => {
  return {
    description: null,
    id: 'plan-1',
    status: 'IN_PROGRESS',
    title: 'Test plan',
  };
};

const task = (
  overrides: Partial<TaskInput> & Pick<TaskInput, 'id'>,
): TaskInput => {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    description: null,
    requirementsJson: '[]',
    sortOrder: 1000,
    status: 'PENDING',
    title: overrides.id,
    ...overrides,
  };
};

describe('formatPlanAndTasksForPrompt', () => {
  it('renders a valid JSON array of requirements', () => {
    const output = formatPlanAndTasksForPrompt(plan(), [
      task({ id: 'a', requirementsJson: '["alpha", "beta"]' }),
    ]);

    expect(output).toContain('Requirements: alpha, beta');
  });

  it('does not throw and skips the line when requirementsJson is invalid JSON', () => {
    const build = () => {
      return formatPlanAndTasksForPrompt(plan(), [
        task({ id: 'bad', requirementsJson: 'not json' }),
      ]);
    };

    expect(build).not.toThrow();
    expect(build()).not.toContain('Requirements:');
  });

  it('does not throw and skips the line when requirementsJson is a non-array', () => {
    const build = () => {
      return formatPlanAndTasksForPrompt(plan(), [
        task({ id: 'obj', requirementsJson: '{"foo":"bar"}' }),
      ]);
    };

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
    const build = () => {
      return formatPlanAndTasksForPrompt(plan(), [
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
    };

    expect(build).not.toThrow();

    const output = build();

    expect(output.indexOf('first')).toBeLessThan(output.indexOf('second'));
  });
});
