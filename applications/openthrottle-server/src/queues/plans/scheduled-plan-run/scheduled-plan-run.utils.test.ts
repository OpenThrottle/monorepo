import { describe, expect, it } from 'vitest';

import { SCHEDULED_PLAN_RUN_GRACE_MS } from '../plans.constants.ts';
import {
  decideScheduledPlanRunFire,
  decideScheduledPlanRunReproject,
} from './scheduled-plan-run.utils.ts';

const NOW = new Date('2026-11-01T12:00:00.000Z');
const MINUTE_MS = 60 * 1_000;
const HOUR_MS = 60 * MINUTE_MS;
/** The scheduled instant `lateByMs` before {@link NOW} (negative: still in the future). */
const scheduledLateBy = (lateByMs: number): Date => {
  return new Date(NOW.getTime() - lateByMs);
};

const idlePlan = {
  hasActiveRun: false,
  hasRunnableTasks: true,
  workspaceError: null,
} as const;

describe('SCHEDULED_PLAN_RUN_GRACE_MS', () => {
  it('is one hour', () => {
    expect(SCHEDULED_PLAN_RUN_GRACE_MS).toBe(HOUR_MS);
  });
});

describe('decideScheduledPlanRunFire', () => {
  it('fires a run that is exactly on time', () => {
    expect(
      decideScheduledPlanRunFire({
        ...idlePlan,
        now: NOW,
        scheduledFor: scheduledLateBy(0),
      }),
    ).toEqual({ kind: 'fire' });
  });

  it('fires a run whose job fired a little early (clock skew) as on time', () => {
    expect(
      decideScheduledPlanRunFire({
        ...idlePlan,
        now: NOW,
        scheduledFor: scheduledLateBy(-5_000),
      }).kind,
    ).toBe('fire');
  });

  it('fires a run that is late but less than an hour late', () => {
    expect(
      decideScheduledPlanRunFire({
        ...idlePlan,
        now: NOW,
        scheduledFor: scheduledLateBy(59 * MINUTE_MS),
      }).kind,
    ).toBe('fire');
    expect(
      decideScheduledPlanRunFire({
        ...idlePlan,
        now: NOW,
        scheduledFor: scheduledLateBy(HOUR_MS - 1),
      }).kind,
    ).toBe('fire');
  });

  it('misses a run that is exactly one hour late (the window is strictly less than an hour)', () => {
    expect(
      decideScheduledPlanRunFire({
        ...idlePlan,
        now: NOW,
        scheduledFor: scheduledLateBy(HOUR_MS),
      }),
    ).toEqual({
      kind: 'missed',
      reason: 'it was 60 minutes late, past the 60-minute grace window',
    });
  });

  it('misses a run that is more than an hour late, and says how late', () => {
    const decision = decideScheduledPlanRunFire({
      ...idlePlan,
      now: NOW,
      scheduledFor: scheduledLateBy(5 * HOUR_MS + 10 * MINUTE_MS),
    });

    expect(decision).toEqual({
      kind: 'missed',
      reason: 'it was 5 hours late, past the 60-minute grace window',
    });
  });

  it('misses a run whose scheduled instant is not a valid date', () => {
    expect(
      decideScheduledPlanRunFire({
        ...idlePlan,
        now: NOW,
        scheduledFor: new Date('not a date'),
      }).kind,
    ).toBe('missed');
  });

  it('supersedes an on-time run when the plan already has an active run', () => {
    expect(
      decideScheduledPlanRunFire({
        hasActiveRun: true,
        hasRunnableTasks: true,
        now: NOW,
        scheduledFor: scheduledLateBy(0),
        workspaceError: null,
      }),
    ).toEqual({
      kind: 'superseded',
      reason: 'the plan already had an active run',
    });
  });

  it('supersedes a run inside the grace window when the plan already has an active run', () => {
    expect(
      decideScheduledPlanRunFire({
        hasActiveRun: true,
        hasRunnableTasks: true,
        now: NOW,
        scheduledFor: scheduledLateBy(30 * MINUTE_MS),
        workspaceError: null,
      }).kind,
    ).toBe('superseded');
  });

  it('reports MISSED, not SUPERSEDED, for a run that is both past the grace window and colliding', () => {
    // Lateness wins: the run would not start even on an idle plan.
    expect(
      decideScheduledPlanRunFire({
        hasActiveRun: true,
        hasRunnableTasks: true,
        now: NOW,
        scheduledFor: scheduledLateBy(2 * HOUR_MS),
        workspaceError: null,
      }).kind,
    ).toBe('missed');
  });

  it('settles a run with nothing to do instead of firing it', () => {
    expect(
      decideScheduledPlanRunFire({
        hasActiveRun: false,
        hasRunnableTasks: false,
        now: NOW,
        scheduledFor: scheduledLateBy(0),
        workspaceError: null,
      }),
    ).toEqual({
      kind: 'nothing_to_run',
      reason: 'the plan had no tasks left to run',
    });
  });

  it('ranks a collision above nothing-to-run, and lateness above both', () => {
    expect(
      decideScheduledPlanRunFire({
        hasActiveRun: true,
        hasRunnableTasks: false,
        now: NOW,
        scheduledFor: scheduledLateBy(0),
        workspaceError: null,
      }).kind,
    ).toBe('superseded');
    expect(
      decideScheduledPlanRunFire({
        hasActiveRun: false,
        hasRunnableTasks: false,
        now: NOW,
        scheduledFor: scheduledLateBy(HOUR_MS),
        workspaceError: null,
      }).kind,
    ).toBe('missed');
  });
});

describe('decideScheduledPlanRunFire — missing workspace', () => {
  const gone = 'workingDirectory does not exist: /gone/worktree';

  it('fails a run whose working directory is gone, carrying the reason', () => {
    expect(
      decideScheduledPlanRunFire({
        ...idlePlan,
        now: NOW,
        scheduledFor: scheduledLateBy(0),
        workspaceError: gone,
      }),
    ).toEqual({ kind: 'workspace_missing', reason: gone });
  });

  it('ranks lateness, a collision and nothing-to-run above a missing workspace', () => {
    expect(
      decideScheduledPlanRunFire({
        ...idlePlan,
        now: NOW,
        scheduledFor: scheduledLateBy(HOUR_MS),
        workspaceError: gone,
      }).kind,
    ).toBe('missed');
    expect(
      decideScheduledPlanRunFire({
        ...idlePlan,
        hasActiveRun: true,
        now: NOW,
        scheduledFor: scheduledLateBy(0),
        workspaceError: gone,
      }).kind,
    ).toBe('superseded');
    expect(
      decideScheduledPlanRunFire({
        ...idlePlan,
        hasRunnableTasks: false,
        now: NOW,
        scheduledFor: scheduledLateBy(0),
        workspaceError: gone,
      }).kind,
    ).toBe('nothing_to_run');
  });
});

describe('decideScheduledPlanRunReproject', () => {
  it('re-enqueues a future run with the time still left', () => {
    expect(
      decideScheduledPlanRunReproject({
        now: NOW,
        scheduledFor: scheduledLateBy(-3 * HOUR_MS),
      }),
    ).toEqual({ delayMs: 3 * HOUR_MS, kind: 'enqueue' });
  });

  it('re-enqueues a run that is due now, or late within the grace window, immediately', () => {
    expect(
      decideScheduledPlanRunReproject({
        now: NOW,
        scheduledFor: scheduledLateBy(0),
      }),
    ).toEqual({ delayMs: 0, kind: 'enqueue' });
    expect(
      decideScheduledPlanRunReproject({
        now: NOW,
        scheduledFor: scheduledLateBy(HOUR_MS - 1),
      }),
    ).toEqual({ delayMs: 0, kind: 'enqueue' });
  });

  it('misses a run exactly one hour late or later', () => {
    expect(
      decideScheduledPlanRunReproject({
        now: NOW,
        scheduledFor: scheduledLateBy(HOUR_MS),
      }).kind,
    ).toBe('missed');
    expect(
      decideScheduledPlanRunReproject({
        now: NOW,
        scheduledFor: scheduledLateBy(26 * HOUR_MS),
      }),
    ).toEqual({
      kind: 'missed',
      reason: 'it was 26 hours late, past the 60-minute grace window',
    });
  });
});
