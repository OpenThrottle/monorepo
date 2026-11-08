import { isGraphqlResponseError } from '@openthrottle/react-router-graphql';

import { toErrorMessage } from '~/global/utils/utils.error-message';
import { PLAN_SCHEDULE_CONFIRM_COPY } from '~/routing/plans/data/data.copy';

/**
 * @description The `extensions.code` values the server rejects a run-now or schedule request with
 * (plan 764c7654, D8). The server owns the list; this mirrors it so the UI can map each code to the
 * confirm or message a fresh page would have shown.
 */
export const PLAN_SCHEDULE_CONFLICT_CODE = {
  PLAN_ACTIVE: 'PLAN_ACTIVE',
  PLAN_ALREADY_SCHEDULED: 'PLAN_ALREADY_SCHEDULED',
  PLAN_NOT_SCHEDULABLE: 'PLAN_NOT_SCHEDULABLE',
} as const;

export type PlanScheduleConflictCode =
  (typeof PLAN_SCHEDULE_CONFLICT_CODE)[keyof typeof PLAN_SCHEDULE_CONFLICT_CODE];

/**
 * @description A conflict as the action hands it to the client: the code plus the scheduled run the
 * server named (`null` when the plan has none). Plain strings, so it survives action serialization.
 */
export interface PlanScheduleConflict {
  readonly code: PlanScheduleConflictCode;
  readonly planRunId: string | null;
  readonly scheduledFor: string | null;
}

/** @description What a failed run-now or schedule request becomes: a confirm to open, or a message. */
export type PlanScheduleFailure =
  { readonly conflict: PlanScheduleConflict } | { readonly message: string };

const isConflictCode = (value: unknown): value is PlanScheduleConflictCode => {
  return Object.values<unknown>(PLAN_SCHEDULE_CONFLICT_CODE).includes(value);
};

const readNullableString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null;
};

/**
 * @description Reads the conflict a thrown GraphQL error carries in `extensions`, or `undefined`
 * when the error is anything else (network, auth, a different GraphQL error).
 */
export const readPlanScheduleConflict = (
  error: unknown,
): PlanScheduleConflict | undefined => {
  if (!isGraphqlResponseError(error)) {
    return undefined;
  }

  const { code, planRunId, scheduledFor } = error.extensions;
  if (!isConflictCode(code)) {
    return undefined;
  }

  return {
    code,
    planRunId: readNullableString(planRunId),
    scheduledFor: readNullableString(scheduledFor),
  };
};

/**
 * @description Reads a conflict back off a route action's returned data (`<intent>Conflict`), where
 * `readPlanScheduleFailure` put it. `undefined` when the data is absent or carries none.
 */
export const readPlanScheduleConflictFromData = (
  data: unknown,
  key: string,
): PlanScheduleConflict | undefined => {
  if (data == null || typeof data !== 'object') {
    return undefined;
  }

  const value: unknown = Reflect.get(data, key);
  if (value == null || typeof value !== 'object') {
    return undefined;
  }

  const code: unknown = Reflect.get(value, 'code');
  if (!isConflictCode(code)) {
    return undefined;
  }

  return {
    code,
    planRunId: readNullableString(Reflect.get(value, 'planRunId')),
    scheduledFor: readNullableString(Reflect.get(value, 'scheduledFor')),
  };
};

/**
 * @description Classifies a failed run-now or schedule request. `PLAN_ALREADY_SCHEDULED` is the one
 * the user can resolve in place, so it comes back as a conflict for a confirm; `PLAN_ACTIVE` and
 * `PLAN_NOT_SCHEDULABLE` get a clear message; anything else keeps its own message.
 */
export const readPlanScheduleFailure = (
  error: unknown,
  fallback: string,
): PlanScheduleFailure => {
  const conflict = readPlanScheduleConflict(error);

  switch (conflict?.code) {
    case PLAN_SCHEDULE_CONFLICT_CODE.PLAN_ALREADY_SCHEDULED:
      return { conflict };
    case PLAN_SCHEDULE_CONFLICT_CODE.PLAN_ACTIVE:
      return { message: PLAN_SCHEDULE_CONFIRM_COPY.conflictActive };
    case PLAN_SCHEDULE_CONFLICT_CODE.PLAN_NOT_SCHEDULABLE:
      return { message: PLAN_SCHEDULE_CONFIRM_COPY.conflictNotSchedulable };
    default:
      return { message: toErrorMessage(error, fallback) };
  }
};
