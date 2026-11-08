import { describe, expect, test } from 'vitest';

import {
  PLAN_RUN_GATING_COPY,
  PLAN_TOOLBAR_COPY,
} from '~/routing/plans/data/data.copy';

import type { PlanToolbarRunTooltipOptions } from '../plan-toolbar-run-label';
import {
  getPlanToolbarRunButtonLabel,
  getPlanToolbarRunTooltip,
} from '../plan-toolbar-run-label';

describe('getPlanToolbarRunButtonLabel', () => {
  test('returns "Completed" for COMPLETED', () => {
    expect(getPlanToolbarRunButtonLabel('COMPLETED')).toBe('Completed');
  });

  test('returns "In progress" for IN_PROGRESS', () => {
    expect(getPlanToolbarRunButtonLabel('IN_PROGRESS')).toBe('In progress');
  });

  test('returns "Add to Queue" for PENDING', () => {
    expect(getPlanToolbarRunButtonLabel('PENDING')).toBe('Add to Queue');
  });

  test('returns "Promoted" for PROMOTED', () => {
    expect(getPlanToolbarRunButtonLabel('PROMOTED')).toBe('Promoted');
  });

  test('returns "Run now" for SCHEDULED, where Run unschedules first', () => {
    expect(getPlanToolbarRunButtonLabel('SCHEDULED')).toBe('Run now');
  });

  test('returns "Queued" for QUEUED', () => {
    expect(getPlanToolbarRunButtonLabel('QUEUED')).toBe('Queued');
  });

  test('returns "Skipped" for SKIPPED', () => {
    expect(getPlanToolbarRunButtonLabel('SKIPPED')).toBe('Skipped');
  });

  test('returns "Run plan" for an unrecognized status', () => {
    expect(getPlanToolbarRunButtonLabel('SOMETHING_ELSE')).toBe('Run plan');
  });

  test('returns "Run plan" when status is undefined', () => {
    expect(getPlanToolbarRunButtonLabel(undefined)).toBe('Run plan');
  });
});

describe('getPlanToolbarRunTooltip', () => {
  const idle: PlanToolbarRunTooltipOptions = {
    branchMissing: false,
    isRunning: false,
    isSubmitting: false,
    isTerminal: false,
    noRunnableTasks: false,
    scheduledRunAt: null,
    workflowRunBlocked: false,
    workflowRunBlockedReason: undefined,
  };
  const SCHEDULED_AT = '2026-11-03T21:00:00.000Z';

  test('falls through to the default tooltip when nothing gates Run', () => {
    expect(getPlanToolbarRunTooltip(idle)).toBe(
      PLAN_TOOLBAR_COPY.runDefaultTooltip,
    );
  });

  test('names the scheduled run when one is waiting', () => {
    expect(
      getPlanToolbarRunTooltip({ ...idle, scheduledRunAt: SCHEDULED_AT }),
    ).toMatch(
      /^A run is scheduled for .+; running now will unschedule it first\.$/,
    );
  });

  test('names the empty plan when no task is runnable, ahead of blocked and missing-branch reasons', () => {
    expect(
      getPlanToolbarRunTooltip({
        ...idle,
        branchMissing: true,
        noRunnableTasks: true,
        workflowRunBlocked: true,
      }),
    ).toBe(PLAN_TOOLBAR_COPY.runNoRunnableTasksTooltip);
  });

  test('blocked and missing-branch reasons outrank scheduled, which no longer gates Run', () => {
    expect(
      getPlanToolbarRunTooltip({
        ...idle,
        branchMissing: true,
        scheduledRunAt: SCHEDULED_AT,
        workflowRunBlocked: true,
        workflowRunBlockedReason: 'Fix CLI options',
      }),
    ).toBe('Fix CLI options');
    expect(
      getPlanToolbarRunTooltip({
        ...idle,
        branchMissing: true,
        scheduledRunAt: SCHEDULED_AT,
      }),
    ).toBe(PLAN_RUN_GATING_COPY.branchRequired);
  });

  test('running and terminal outrank scheduled; submitting outranks everything', () => {
    const scheduled = { ...idle, scheduledRunAt: SCHEDULED_AT };

    expect(getPlanToolbarRunTooltip({ ...scheduled, isRunning: true })).toBe(
      PLAN_TOOLBAR_COPY.runRunningTooltip,
    );
    expect(getPlanToolbarRunTooltip({ ...scheduled, isTerminal: true })).toBe(
      PLAN_TOOLBAR_COPY.runTerminalTooltip,
    );
    expect(
      getPlanToolbarRunTooltip({
        ...scheduled,
        isSubmitting: true,
        isTerminal: true,
      }),
    ).toBe('Submitting…');
  });

  test('uses the workflow reason, then its fallback, then the branch reason', () => {
    expect(
      getPlanToolbarRunTooltip({
        ...idle,
        workflowRunBlocked: true,
        workflowRunBlockedReason: 'Fix CLI options',
      }),
    ).toBe('Fix CLI options');
    expect(
      getPlanToolbarRunTooltip({ ...idle, workflowRunBlocked: true }),
    ).toBe(PLAN_TOOLBAR_COPY.workflowRunBlockedFallback);
    expect(getPlanToolbarRunTooltip({ ...idle, branchMissing: true })).toBe(
      PLAN_RUN_GATING_COPY.branchRequired,
    );
  });
});
