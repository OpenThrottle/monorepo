import { describe, expect, test } from 'vitest';

import {
  buildTaskTrajectoriesHref,
  buildTrajectoriesListHref,
  buildTrajectoryPlanGroupHref,
  buildTrajectoryViewerHref,
  trajectoryPlanGroupAnchor,
} from '~/routing/evals/utils/hrefs';

describe('hrefs', () => {
  describe('trajectoryPlanGroupAnchor', () => {
    test('keys a live plan by its id', () => {
      expect(trajectoryPlanGroupAnchor('plan-1')).toBe('plan-group-plan-1');
    });

    test('keys the deleted-plan group as unknown', () => {
      expect(trajectoryPlanGroupAnchor(null)).toBe('plan-group-unknown');
    });
  });

  test('buildTrajectoryPlanGroupHref opens the All filter at the group', () => {
    expect(buildTrajectoryPlanGroupHref('plan-1')).toBe(
      '/evals/trajectories?score=all#plan-group-plan-1',
    );
  });

  test('buildTrajectoryViewerHref points under /evals', () => {
    expect(buildTrajectoryViewerHref('t-1')).toBe('/evals/trajectories/t-1');
  });

  test("buildTaskTrajectoriesHref points at the task's Trajectories tab", () => {
    expect(buildTaskTrajectoriesHref('p', 't')).toBe(
      '/plans/p/tasks/t?tab=trajectories',
    );
  });
});

describe('buildTrajectoriesListHref', () => {
  test('is the bare tab URL for the default filter', () => {
    expect(
      buildTrajectoriesListHref({
        after: null,
        filter: 'unscored',
        repositoryId: null,
      }),
    ).toBe('/evals/trajectories');
  });

  test('carries the filter, repository and cursor', () => {
    expect(
      buildTrajectoriesListHref({
        after: 'c1',
        filter: 'all',
        repositoryId: 'r1',
      }),
    ).toBe('/evals/trajectories?score=all&repositoryId=r1&after=c1');
  });
});
