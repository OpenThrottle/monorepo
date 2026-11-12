import { BadRequestException } from '@nestjs/common';
import type { PlanRunConfigRunner } from '@openthrottle/nestjs-repositories';
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
 * A GraphQLError rather than Nest's ConflictException on purpose: the Apollo driver maps a 409
 * HttpException to `INTERNAL_SERVER_ERROR` (409 is not one of its predefined codes) and tucks the
 * payload under `extensions.originalError`, and the shared `formatError` masks every
 * INTERNAL_SERVER_ERROR message in production. Clients could then never read the code.
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

const isPlanRunConfigRunner = (value: string): value is PlanRunConfigRunner => {
  return value === 'ot-loop' || value === 'ralph';
};

/**
 * @description The runner a run uses: the request's `runner` when it names one, else the plan's
 * stored `runConfig.runner`, else `undefined` (Ralph; the key stays off the job payload so existing
 * runs are byte-for-byte unchanged). A request naming anything but `ralph` or `ot-loop` is a 400.
 */
export const resolveRequestedRunner = (
  requested: string | null | undefined,
  stored: PlanRunConfigRunner | undefined,
): PlanRunConfigRunner | undefined => {
  const trimmed = requested?.trim() ?? '';

  if (trimmed === '') {
    return stored;
  }

  if (!isPlanRunConfigRunner(trimmed)) {
    throw new BadRequestException(
      `Invalid runner: ${trimmed} (expected one of: ralph, ot-loop)`,
    );
  }

  return trimmed;
};
