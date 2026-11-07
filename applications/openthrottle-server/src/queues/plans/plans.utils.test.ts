import { describe, expect, it } from 'vitest';

import type { PlanTaskOutcomeFields } from './plans.types.ts';
import {
  buildFinishedRunNotification,
  countPlanTasks,
  resolveIdlePlanStatus,
} from './plans.utils.ts';

const task = (
  status: string,
  hook: Partial<PlanTaskOutcomeFields> = {},
): PlanTaskOutcomeFields => {
  return {
    hookRole: null,
    hookSource: null,
    parentTaskId: null,
    status,
    ...hook,
  };
};

describe('countPlanTasks', () => {
  it('splits workable (PENDING/QUEUED/IN_PROGRESS) from blocked, and ignores terminal tasks', () => {
    expect(
      countPlanTasks([
        task('COMPLETED'),
        task('PENDING'),
        task('QUEUED'),
        task('IN_PROGRESS'),
        task('BLOCKED'),
        task('SKIPPED'),
      ]),
    ).toEqual({ blocked: 1, remaining: 4, workable: 3 });
  });

  it('does not count a runner-executed plan-level skill hook task as work', () => {
    expect(
      countPlanTasks([
        task('PENDING', { hookRole: 'before_all', hookSource: 'skill' }),
        task('BLOCKED'),
      ]),
    ).toEqual({ blocked: 1, remaining: 1, workable: 0 });
  });
});

describe('resolveIdlePlanStatus', () => {
  it('QUEUED while any task is workable', () => {
    expect(
      resolveIdlePlanStatus({ blocked: 2, remaining: 3, workable: 1 }),
    ).toBe('QUEUED');
  });

  it('BLOCKED when only BLOCKED tasks remain', () => {
    expect(
      resolveIdlePlanStatus({ blocked: 1, remaining: 1, workable: 0 }),
    ).toBe('BLOCKED');
  });

  it('COMPLETED when nothing remains', () => {
    expect(
      resolveIdlePlanStatus({ blocked: 0, remaining: 0, workable: 0 }),
    ).toBe('COMPLETED');
  });

  it('QUEUED for a plan with no tasks at all (never run, not stranded)', () => {
    expect(resolveIdlePlanStatus(undefined)).toBe('QUEUED');
  });
});

describe('buildFinishedRunNotification', () => {
  const base = {
    counts: { blocked: 1, remaining: 3, workable: 2 },
    planId: 'plan-1',
    planStatus: 'BLOCKED',
    prNumber: undefined,
  } as const;

  it('workflow_tasks_blocked warns with the blocked count and the draft PR', () => {
    expect(
      buildFinishedRunNotification({
        ...base,
        prNumber: 7,
        reason: 'workflow_tasks_blocked',
      }),
    ).toEqual({
      message: 'Plan blocked: 1 task(s) need attention — plan-1. PR #7.',
      severity: 'warning',
    });
  });

  it('workflow_max_iterations names the iteration limit and the pending/blocked split', () => {
    const { message, severity } = buildFinishedRunNotification({
      ...base,
      reason: 'workflow_max_iterations',
    });

    expect(severity).toBe('warning');
    expect(message).toContain('Plan hit its iteration limit');
    expect(message).toContain('2 task(s) still pending, 1 blocked');
    expect(message).not.toContain('PR #');
  });

  it('workflow_budget_exhausted names the time budget', () => {
    expect(
      buildFinishedRunNotification({
        ...base,
        reason: 'workflow_budget_exhausted',
      }).message,
    ).toContain('Plan hit its time budget');
  });

  it('a limit-stopped run whose last iteration completed the plan is a success', () => {
    expect(
      buildFinishedRunNotification({
        ...base,
        planStatus: 'COMPLETED',
        reason: 'workflow_max_iterations',
      }),
    ).toEqual({
      message: 'Plan run finished: plan-1 (workflow_max_iterations)',
      severity: 'success',
    });
  });

  it('workflow_complete_handoff_owed warns and keeps the reason', () => {
    expect(
      buildFinishedRunNotification({
        ...base,
        reason: 'workflow_complete_handoff_owed',
      }),
    ).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('workflow_complete_handoff_owed'),
        severity: 'warning',
      }),
    );
  });

  it('workflow_plan_already_terminal reports a skipped run', () => {
    expect(
      buildFinishedRunNotification({
        ...base,
        reason: 'workflow_plan_already_terminal',
      }).message,
    ).toContain('Plan run skipped');
  });

  it('workflow_tasks_exhausted is a success and links the PR when there is one', () => {
    expect(
      buildFinishedRunNotification({
        ...base,
        planStatus: 'COMPLETED',
        prNumber: 9,
        reason: 'workflow_tasks_exhausted',
      }),
    ).toEqual({
      message: 'Plan run finished: plan-1 (workflow_tasks_exhausted) PR #9.',
      severity: 'success',
    });
  });
});
