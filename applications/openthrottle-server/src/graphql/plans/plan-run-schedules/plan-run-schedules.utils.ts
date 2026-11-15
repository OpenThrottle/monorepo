import { BadRequestException } from '@nestjs/common';
import type {
  PlanRunSchedule,
  PlanRunScheduleMisfirePolicy,
} from '@openthrottle/nestjs-repositories';
import { PLAN_RUN_SCHEDULE_MISFIRE_POLICIES } from '@openthrottle/nestjs-repositories';
import { isRecord } from '@openthrottle/nodejs-utils';

import { validatePlanRunScheduleCron } from '../../../queues/plans/plan-run-schedule/plan-run-schedule.utils.ts';
import { PlanRunScheduleObject } from './plan-run-schedules.object.ts';

const ALLOWED_RUN_OVERRIDE_KEYS = [
  'branch',
  'effort',
  'iterations',
  'model',
] as const;

type ParseResult<T> =
  | { readonly ok: false; readonly reason: string }
  | { readonly ok: true; readonly value: T };

/** @description Narrows a string to a known misfire policy. */
export const isPlanRunScheduleMisfirePolicy = (
  value: string,
): value is PlanRunScheduleMisfirePolicy => {
  return Object.values<string>(PLAN_RUN_SCHEDULE_MISFIRE_POLICIES).includes(
    value,
  );
};

/** @description Validates a misfire policy string against the const object. */
export const parseMisfirePolicy = (
  value: string,
): ParseResult<PlanRunScheduleMisfirePolicy> => {
  if (!isPlanRunScheduleMisfirePolicy(value)) {
    const allowed = Object.values(PLAN_RUN_SCHEDULE_MISFIRE_POLICIES).join(
      ', ',
    );

    return {
      ok: false,
      reason: `Invalid misfirePolicy "${value}" (expected one of: ${allowed}).`,
    };
  }

  return { ok: true, value };
};

/**
 * @description Parses `runOverridesJson`: a JSON object whose only keys are branch, effort, iterations
 * and model (strings, and a positive integer for iterations). Returns the reason on rejection.
 */
export const parseRunOverridesJson = (
  json: string,
): ParseResult<Record<string, unknown>> => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: `runOverridesJson is not valid JSON.` };
  }

  if (!isRecord(parsed)) {
    return { ok: false, reason: `runOverridesJson must be a JSON object.` };
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (!ALLOWED_RUN_OVERRIDE_KEYS.some((allowed) => allowed === key)) {
      return {
        ok: false,
        reason: `Unsupported run override "${key}" (allowed: ${ALLOWED_RUN_OVERRIDE_KEYS.join(', ')}).`,
      };
    }

    if (key === 'iterations') {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
        return {
          ok: false,
          reason: `Run override "iterations" must be a positive integer.`,
        };
      }
    } else if (typeof value !== 'string' || value.trim() === '') {
      return {
        ok: false,
        reason: `Run override "${key}" must be a non-empty string.`,
      };
    }
  }

  return { ok: true, value: parsed };
};

/** @description Maps a schedule row to its GraphQL object; the occurrence fields are left to field resolvers. */
export const mapPlanRunScheduleObject = (
  schedule: PlanRunSchedule,
): PlanRunScheduleObject => {
  const out = new PlanRunScheduleObject();

  out.createdAt = schedule.createdAt;
  out.createdBy = schedule.createdBy;
  out.cronPattern = schedule.cronPattern;
  out.enabled = schedule.enabled;
  out.id = schedule.id;
  out.misfirePolicy = schedule.misfirePolicy;
  out.planId = schedule.planId;
  out.runOverridesJson = JSON.stringify(schedule.runOverrides);
  out.scheduleKind = schedule.scheduleKind;
  out.timezone = schedule.timezone;
  out.updatedAt = schedule.updatedAt;

  return out;
};

/** @description Trims a timezone; blank or missing means UTC (null). */
export const normalizeTimezone = (
  timezone: string | null | undefined,
): string | null => {
  const trimmed = timezone?.trim();

  return trimmed === undefined || trimmed === '' ? null : trimmed;
};

/** @description Throws BadRequestException with the validator's reason for an unusable cron/timezone. */
export const assertValidCron = (
  cronPattern: string,
  timezone: string | null,
): void => {
  const result = validatePlanRunScheduleCron(cronPattern.trim(), timezone);

  if (!result.ok) {
    throw new BadRequestException(result.reason);
  }
};

/** @description Undefined when not provided; throws BadRequestException for an unknown policy. */
export const parseOptionalMisfirePolicy = (
  value: string | null | undefined,
): PlanRunScheduleMisfirePolicy | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const parsed = parseMisfirePolicy(value);

  if (!parsed.ok) {
    throw new BadRequestException(parsed.reason);
  }

  return parsed.value;
};

/** @description Undefined when not provided; throws BadRequestException for invalid overrides. */
export const parseOptionalRunOverrides = (
  value: string | null | undefined,
): Record<string, unknown> | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const parsed = parseRunOverridesJson(value);

  if (!parsed.ok) {
    throw new BadRequestException(parsed.reason);
  }

  return parsed.value;
};
