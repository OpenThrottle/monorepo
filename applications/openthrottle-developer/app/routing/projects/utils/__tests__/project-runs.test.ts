import { describe, expect, test } from 'vitest';

import type { ProjectRunPanelDetailsFragment } from '~/__generated__/graphql';

import { getProjectRunPlanMarkers, getProjectRunState } from '../project-runs';

const run = (
  overrides: Partial<ProjectRunPanelDetailsFragment>,
): ProjectRunPanelDetailsFragment => {
  return {
    cancelRequestedAt: null,
    currentPlan: { id: 'plan-1', title: 'First' },
    id: 'run-1',
    settledAt: null,
    status: 'IN_PROGRESS',
    stoppedByPlan: null,
    stoppedReason: null,
    ...overrides,
  };
};

describe('getProjectRunState', () => {
  test('maps no run and each status', () => {
    expect(getProjectRunState(null)).toBe('idle');
    expect(getProjectRunState(run({ status: 'QUEUED' }))).toBe('running');
    expect(getProjectRunState(run({ status: 'IN_PROGRESS' }))).toBe('running');
    expect(getProjectRunState(run({ status: 'STOPPED' }))).toBe('stopped');
    expect(getProjectRunState(run({ status: 'CANCELLED' }))).toBe('cancelled');
    expect(getProjectRunState(run({ status: 'COMPLETED' }))).toBe('completed');
  });
});

describe('getProjectRunPlanMarkers', () => {
  test('marks the current plan of an active run', () => {
    expect(getProjectRunPlanMarkers(run({}))).toEqual({
      currentPlanId: 'plan-1',
      stoppedByPlanId: null,
    });
  });

  test('marks the stopping plan of a stopped run, and no current plan', () => {
    expect(
      getProjectRunPlanMarkers(
        run({
          status: 'STOPPED',
          stoppedByPlan: { id: 'plan-2', title: 'Two' },
        }),
      ),
    ).toEqual({ currentPlanId: null, stoppedByPlanId: 'plan-2' });
  });

  test('marks nothing for a settled or missing run', () => {
    expect(getProjectRunPlanMarkers(run({ status: 'COMPLETED' }))).toEqual({
      currentPlanId: null,
      stoppedByPlanId: null,
    });
    expect(getProjectRunPlanMarkers(null)).toEqual({
      currentPlanId: null,
      stoppedByPlanId: null,
    });
  });
});
