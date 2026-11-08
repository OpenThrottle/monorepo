import type { PLAN_RUN_STATUS } from './plan-runs.constants.ts';

export type PlanRunStatus =
  (typeof PLAN_RUN_STATUS)[keyof typeof PLAN_RUN_STATUS];
/**
 * @description A SCHEDULED run that was just cancelled: its id, and the delayed BullMQ job the caller
 * should remove (null when the row never recorded one).
 * @public
 */
export interface ScheduledRunRef {
  readonly bullmqJobId: string | null;
  readonly id: string;
}

/** A plan's soonest SCHEDULED run: which row it is and the instant it fires. */
export interface ScheduledPlanRun {
  readonly id: string;
  readonly scheduledFor: Date;
}
