import { GraphQLError } from 'graphql';
import { QueryFailedError } from 'typeorm';

import {
  ACTIVE_PLAN_STATUSES,
  ONE_SCHEDULED_RUN_INDEX,
  PLAN_SCHEDULE_CONFLICT_CODE,
  SCHEDULABLE_PLAN_STATUSES,
} from './plan-enqueue.constants.ts';
import type {
  PlanSchedulability,
  PlanScheduleConflictCode,
} from './plan-enqueue.types.ts';

/**
 * @description Pure D2/D3 gate for `schedulePlanRun`: PENDING and BACKLOG schedule; SCHEDULED is
 * `PLAN_ALREADY_SCHEDULED`; QUEUED / IN_PROGRESS are `PLAN_ACTIVE`; everything else (BLOCKED and the
 * terminal statuses) is `PLAN_NOT_SCHEDULABLE`.
 */
export const decidePlanSchedulability = (
  planStatus: string,
): PlanSchedulability => {
  const status = planStatus.trim().toUpperCase();

  if (SCHEDULABLE_PLAN_STATUSES.includes(status)) {
    return { kind: 'schedulable' };
  }

  if (status === 'SCHEDULED') {
    return {
      code: PLAN_SCHEDULE_CONFLICT_CODE.PLAN_ALREADY_SCHEDULED,
      kind: 'conflict',
      message: `Plan already has a scheduled run; pass replaceScheduled to reschedule it`,
    };
  }

  if (ACTIVE_PLAN_STATUSES.includes(status)) {
    return {
      code: PLAN_SCHEDULE_CONFLICT_CODE.PLAN_ACTIVE,
      kind: 'conflict',
      message: `Plan is ${status}; a plan with a queued or running run cannot be scheduled`,
    };
  }

  return {
    code: PLAN_SCHEDULE_CONFLICT_CODE.PLAN_NOT_SCHEDULABLE,
    kind: 'conflict',
    message: `Plan is ${status}; only PENDING and BACKLOG plans can be scheduled`,
  };
};

/**
 * @description Builds the D8 rejection: a GraphQL error whose `extensions` carry the conflict
 * `code` and the plan's scheduled run (`planRunId`, `scheduledFor`, both null when it has none).
 * It travels as an ordinary GraphQL error (HTTP 200, `errors[]`): an `extensions.http.status` would
 * make Apollo answer with that HTTP status, which GraphQL clients treat as a transport failure.
 *
 * A GraphQLError rather than Nest's ConflictException on purpose: the shared `formatError` turns
 * a ConflictException into the generic code `CONFLICT` and drops everything else it carried, so
 * the specific conflict code and the run fields here would never reach the client.
 */
export const createPlanScheduleConflictError = (params: {
  readonly code: PlanScheduleConflictCode;
  readonly message: string;
  readonly planRunId: string | null;
  readonly scheduledFor: Date | null;
}): GraphQLError => {
  const { code, message, planRunId, scheduledFor } = params;

  return new GraphQLError(message, {
    extensions: {
      code,
      planRunId,
      scheduledFor: scheduledFor?.toISOString() ?? null,
    },
  });
};

/**
 * @description True when `error` is a Postgres unique violation (23505) of the
 * one-SCHEDULED-run-per-plan index — the race path of D3, mapped to `PLAN_ALREADY_SCHEDULED`.
 */
export const isOneScheduledRunViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;

  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505' &&
    'constraint' in driverError &&
    driverError.constraint === ONE_SCHEDULED_RUN_INDEX
  );
};
