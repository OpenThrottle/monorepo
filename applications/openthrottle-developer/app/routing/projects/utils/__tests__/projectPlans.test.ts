import { describe, expect, test } from 'vitest';

import {
  getAvailablePlans,
  getProjectPlanProgress,
  getUnlinkedRepositories,
  moveProjectPlanId,
} from '../projectPlans';

describe('moveProjectPlanId', () => {
  const ids = ['a', 'b', 'c'];

  test('moves an id up by swapping with its predecessor', () => {
    expect(moveProjectPlanId(ids, 'b', 'up')).toEqual(['b', 'a', 'c']);
  });

  test('moves an id down by swapping with its successor', () => {
    expect(moveProjectPlanId(ids, 'b', 'down')).toEqual(['a', 'c', 'b']);
  });

  test('leaves the order unchanged at an edge', () => {
    expect(moveProjectPlanId(ids, 'a', 'up')).toEqual(ids);
    expect(moveProjectPlanId(ids, 'c', 'down')).toEqual(ids);
  });

  test('leaves the order unchanged for an unknown id and does not mutate', () => {
    expect(moveProjectPlanId(ids, 'z', 'up')).toEqual(ids);
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});

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
