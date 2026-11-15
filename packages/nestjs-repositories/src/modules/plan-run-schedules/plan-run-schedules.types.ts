import type {
  PLAN_RUN_SCHEDULE_KINDS,
  PLAN_RUN_SCHEDULE_MISFIRE_POLICIES,
} from './plan-run-schedules.constants.ts';

/** @public */
export type PlanRunScheduleKind =
  (typeof PLAN_RUN_SCHEDULE_KINDS)[keyof typeof PLAN_RUN_SCHEDULE_KINDS];

/** @public */
export type PlanRunScheduleMisfirePolicy =
  (typeof PLAN_RUN_SCHEDULE_MISFIRE_POLICIES)[keyof typeof PLAN_RUN_SCHEDULE_MISFIRE_POLICIES];

/**
 * @public
 * @description Input for creating a recurring plan-run schedule. `timezone` null means UTC;
 * `misfirePolicy` and `runOverrides` default to `skip` and `{}`.
 */
export interface CreatePlanRunScheduleInput {
  readonly createdBy: string | null;
  readonly cronPattern: string;
  readonly enabled: boolean | undefined;
  readonly misfirePolicy: PlanRunScheduleMisfirePolicy | undefined;
  readonly planId: string;
  readonly runOverrides: Readonly<Record<string, unknown>> | undefined;
  readonly timezone: string | null;
}

/**
 * @public
 * @description Fields of a schedule that may change after creation. A key left `undefined` is
 * not touched; `timezone: null` resets to UTC.
 */
export interface UpdatePlanRunSchedulePatch {
  readonly cronPattern: string | undefined;
  readonly enabled: boolean | undefined;
  readonly misfirePolicy: PlanRunScheduleMisfirePolicy | undefined;
  readonly runOverrides: Readonly<Record<string, unknown>> | undefined;
  readonly timezone: string | null | undefined;
}
