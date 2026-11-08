import type {
  PLAN_STATUS,
  REMAINING_TASK_STATUSES,
  TASK_STATUS,
} from './config.constants.ts';
/** @public */
export type PlanStatus = (typeof PLAN_STATUS)[keyof typeof PLAN_STATUS];

/** @public */
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

/** @public */
export type RemainingTaskStatus = (typeof REMAINING_TASK_STATUSES)[number];
