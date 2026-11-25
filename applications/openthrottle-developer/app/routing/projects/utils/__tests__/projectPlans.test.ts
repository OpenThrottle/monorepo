import { describe, expect, test } from 'vitest';

import {
  buildNewPlanPrompt,
  getAvailablePlans,
  getProjectPlanProgress,
  getUnlinkedRepositories,
} from '../projectPlans';

describe('getProjectPlanProgress', () => {
  test('counts COMPLETED plans against the total', () => {
    expect(
      getProjectPlanProgress([
        { status: 'COMPLETED' },
        { status: 'PENDING' },
        { status: 'COMPLETED' },
      ]),
    ).toEqual({ completed: 2, total: 3 });
  });

  test('is 0/0 for no plans', () => {
    expect(getProjectPlanProgress([])).toEqual({ completed: 0, total: 0 });
  });
});

describe('getAvailablePlans', () => {
  test('drops plans already in the project', () => {
    const plans = [
      { id: '1', projectId: 'p' },
      { id: '2', projectId: 'other' },
      { id: '3', projectId: null },
    ];
    expect(getAvailablePlans(plans, 'p').map((plan) => plan.id)).toEqual([
      '2',
      '3',
    ]);
  });
});

describe('getUnlinkedRepositories', () => {
  test('drops repositories already linked', () => {
    const all = [{ id: 'r1' }, { id: 'r2' }];
    expect(getUnlinkedRepositories(all, [{ id: 'r1' }])).toEqual([
      { id: 'r2' },
    ]);
  });
});

describe('buildNewPlanPrompt', () => {
  test('names the project and the projectId to pass to create_plan', () => {
    const prompt = buildNewPlanPrompt({ id: 'proj-1', name: 'Atlas' });

    expect(prompt).toContain('"Atlas"');
    expect(prompt).toContain('projectId: proj-1');
    expect(prompt).toContain('create_plan');
  });
});
