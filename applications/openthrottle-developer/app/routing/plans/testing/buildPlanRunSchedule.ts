import type { PlanRunScheduleFieldsFragment } from '~/__generated__/graphql';

/**
 * @description A recurring schedule as the plan detail loader returns it (weekdays at 09:00
 * Pacific, its pending occurrence `run-9`). Tests override only what they assert on.
 */
export const buildPlanRunSchedule = (
  overrides: Partial<PlanRunScheduleFieldsFragment> = {},
): PlanRunScheduleFieldsFragment => {
  return {
    __typename: 'PlanRunSchedule',
    cronPattern: '0 9 * * 1-5',
    enabled: true,
    id: 'schedule-1',
    nextOccurrenceAt: '2026-11-16T17:00:00.000Z',
    pendingPlanRunId: 'run-9',
    timezone: 'America/Los_Angeles',
    ...overrides,
  };
};
