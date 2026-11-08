import { describe, expect, test } from 'vitest';

import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';

import { getPlanScheduleDisabledReason } from '../plan-schedule-gate';

describe('getPlanScheduleDisabledReason', () => {
  test.each(['PENDING', 'BACKLOG', 'SCHEDULED'])(
    'allows scheduling a %s plan',
    (status) => {
      expect(getPlanScheduleDisabledReason(status)).toBeNull();
    },
  );

  test('allows an unknown or missing status, leaving the server as the gate', () => {
    expect(getPlanScheduleDisabledReason(undefined)).toBeNull();
    expect(getPlanScheduleDisabledReason(null)).toBeNull();
    expect(getPlanScheduleDisabledReason('SOMETHING_NEW')).toBeNull();
  });

  test('names BLOCKED as the reason for a blocked plan', () => {
    expect(getPlanScheduleDisabledReason('BLOCKED')).toBe(
      PLAN_TOOLBAR_COPY.scheduleBlockedTooltip,
    );
  });

  test.each(['QUEUED', 'IN_PROGRESS'])(
    'names the active run as the reason for a %s plan',
    (status) => {
      expect(getPlanScheduleDisabledReason(status)).toBe(
        PLAN_TOOLBAR_COPY.scheduleActiveTooltip,
      );
    },
  );

  test.each(['COMPLETED', 'CANCELED', 'PROMOTED', 'SKIPPED'])(
    'names the terminal state as the reason for a %s plan',
    (status) => {
      expect(getPlanScheduleDisabledReason(status)).toBe(
        PLAN_TOOLBAR_COPY.scheduleTerminalTooltip,
      );
    },
  );

  test('disables Schedule for an otherwise schedulable plan with no runnable tasks', () => {
    expect(getPlanScheduleDisabledReason('PENDING', true)).toBe(
      PLAN_TOOLBAR_COPY.runNoRunnableTasksTooltip,
    );
  });
});
