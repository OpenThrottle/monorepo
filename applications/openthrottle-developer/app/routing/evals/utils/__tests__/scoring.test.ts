import { describe, expect, test } from 'vitest';

import type { AgentTrajectoryScoringGroupFragment } from '~/__generated__/graphql';

import {
  buildTrajectoryScoring,
  findFirstUnscoredTrajectory,
  pickNextScoringTarget,
} from '../scoring';

const group = (
  planId: string | null,
  verdicts: readonly (string | null)[],
): AgentTrajectoryScoringGroupFragment => {
  return {
    planId,
    planTitle: planId === null ? null : `Plan ${planId}`,
    scoredCount: verdicts.filter((verdict) => verdict !== null).length,
    trajectories: verdicts.map((verdict, index) => {
      return { id: `${planId ?? 'gone'}-t${index}`, verdict };
    }),
    trajectoryCount: verdicts.length,
  };
};

describe('findFirstUnscoredTrajectory', () => {
  test('returns the first row without a verdict', () => {
    expect(
      findFirstUnscoredTrajectory(
        group('a', ['pass', null, null]).trajectories,
      ),
    ).toBe('a-t1');
  });

  test('is null when every row is scored', () => {
    expect(
      findFirstUnscoredTrajectory(group('a', ['pass', 'fail']).trajectories),
    ).toBeNull();
  });
});

describe('pickNextScoringTarget', () => {
  describe('when this plan has another unscored trajectory', () => {
    test('picks the first one after the current, in group order', () => {
      expect(
        pickNextScoringTarget({
          currentPlanId: 'a',
          currentTrajectoryId: 'a-t1',
          planGroup: group('a', [null, 'pass', 'pass', null]),
          unscoredGroups: [],
        }),
      ).toEqual({ kind: 'in-plan', trajectoryId: 'a-t3' });
    });

    test('wraps to one before the current when none follow', () => {
      expect(
        pickNextScoringTarget({
          currentPlanId: 'a',
          currentTrajectoryId: 'a-t2',
          planGroup: group('a', [null, 'pass', 'pass']),
          unscoredGroups: [],
        }),
      ).toEqual({ kind: 'in-plan', trajectoryId: 'a-t0' });
    });

    test('never picks the current trajectory itself', () => {
      expect(
        pickNextScoringTarget({
          currentPlanId: 'a',
          currentTrajectoryId: 'a-t0',
          planGroup: group('a', [null]),
          unscoredGroups: [],
        }),
      ).toEqual({ kind: 'all-scored' });
    });
  });

  describe('when this plan is fully scored', () => {
    test('falls back to the next plan with unscored rows, skipping this one', () => {
      expect(
        pickNextScoringTarget({
          currentPlanId: 'a',
          currentTrajectoryId: 'a-t0',
          planGroup: group('a', ['pass', 'fail']),
          unscoredGroups: [group('a', [null]), group('b', ['pass', null])],
        }),
      ).toEqual({
        kind: 'next-plan',
        planTitle: 'Plan b',
        trajectoryId: 'b-t1',
      });
    });

    test('reports all scored when no other plan has unscored rows', () => {
      expect(
        pickNextScoringTarget({
          currentPlanId: 'a',
          currentTrajectoryId: 'a-t0',
          planGroup: group('a', ['pass']),
          unscoredGroups: [group('a', [null])],
        }),
      ).toEqual({ kind: 'all-scored' });
    });
  });

  describe('when the plan is unknown', () => {
    test('goes straight to the next plan', () => {
      expect(
        pickNextScoringTarget({
          currentPlanId: null,
          currentTrajectoryId: 'x',
          planGroup: null,
          unscoredGroups: [group(null, [null]), group('b', [null])],
        }),
      ).toEqual({
        kind: 'next-plan',
        planTitle: 'Plan b',
        trajectoryId: 'b-t0',
      });
    });
  });
});

describe('buildTrajectoryScoring', () => {
  test("carries this plan's progress", () => {
    expect(
      buildTrajectoryScoring({
        currentPlanId: 'a',
        currentTrajectoryId: 'a-t0',
        planGroup: group('a', ['pass', null, 'fail']),
        unscoredGroups: [],
      }),
    ).toMatchObject({ scoredCount: 2, trajectoryCount: 3 });
  });

  test('is zero of zero without a plan', () => {
    expect(
      buildTrajectoryScoring({
        currentPlanId: null,
        currentTrajectoryId: 'x',
        planGroup: null,
        unscoredGroups: [],
      }),
    ).toEqual({
      next: { kind: 'all-scored' },
      scoredCount: 0,
      trajectoryCount: 0,
    });
  });
});
