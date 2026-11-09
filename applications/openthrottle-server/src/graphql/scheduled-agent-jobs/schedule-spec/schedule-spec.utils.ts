/**
 * @description Validates the "when" of a scheduled agent job: its kind plus the one field that kind
 * needs. A cron schedule needs `cronPattern`; an interval needs `intervalMs` (whole ms, at least a
 * minute); a once schedule needs `runAt`, an ISO 8601 instant WITH an offset (`Z` or `±hh:mm`) —
 * without one the instant would depend on the server's timezone. The fields of the other kinds are
 * cleared, so a row always has exactly the field its kind uses.
 */
import {
  SCHEDULED_AGENT_JOB_SCHEDULE_KINDS,
  type ScheduledAgentJob,
  type ScheduledAgentJobScheduleKind,
} from '@openthrottle/nestjs-repositories';

import { SCHEDULED_AGENT_JOB_MIN_INTERVAL_MS } from '../../../queues/scheduled-agent-jobs/schedule-kind/schedule-kind.constants.ts';
import { validateScheduledAgentJobCron } from '../cron/cron.utils.ts';
import type {
  ScheduleSpecRequest,
  ScheduleSpecResult,
} from './schedule-spec.types.ts';
/** ISO 8601 date-time with a mandatory offset: `2026-11-03T09:00Z`, `...T09:00:00.000-08:00`. */
const ISO_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

const fail = (reason: string): ScheduleSpecResult => {
  return { ok: false, reason };
};

const supplied = <TValue>(
  value: TValue | null | undefined,
): value is TValue => {
  return value !== null && value !== undefined;
};

/** @description Parses an ISO 8601 instant that names its offset, or null when it does not. */
export const parseRunAtWithOffset = (raw: string): Date | null => {
  const trimmed = raw.trim();
  if (!ISO_WITH_OFFSET.test(trimmed)) return null;

  const parsed = new Date(trimmed);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** @description The schedule kind from a request, the existing kind, or `cron`; null when unknown. */
const resolveKind = (
  raw: string | null | undefined,
  existing: ScheduledAgentJobScheduleKind | undefined,
): ScheduledAgentJobScheduleKind | null => {
  if (!supplied(raw)) {
    return (
      SCHEDULED_AGENT_JOB_SCHEDULE_KINDS.find((kind) => kind === existing) ??
      'cron'
    );
  }

  return (
    SCHEDULED_AGENT_JOB_SCHEDULE_KINDS.find((kind) => kind === raw) ?? null
  );
};

const resolveCron = (
  request: ScheduleSpecRequest,
  existing: ScheduledAgentJob | undefined,
): ScheduleSpecResult => {
  const cronPattern = request.cronPattern ?? existing?.cronPattern ?? null;
  if (cronPattern === null || cronPattern.trim() === '') {
    return fail('A cron schedule needs a cron pattern.');
  }

  const cron = validateScheduledAgentJobCron(cronPattern);
  if (!cron.ok) return fail(cron.reason ?? 'Invalid cron pattern');

  return {
    ok: true,
    spec: { cronPattern, intervalMs: null, runAt: null, scheduleKind: 'cron' },
  };
};

const resolveInterval = (
  request: ScheduleSpecRequest,
  existing: ScheduledAgentJob | undefined,
): ScheduleSpecResult => {
  const intervalMs = request.intervalMs ?? existing?.intervalMs ?? null;
  if (
    intervalMs === null ||
    !Number.isInteger(intervalMs) ||
    intervalMs < SCHEDULED_AGENT_JOB_MIN_INTERVAL_MS
  ) {
    return fail(
      `An interval schedule needs intervalMs, a whole number of at least ${SCHEDULED_AGENT_JOB_MIN_INTERVAL_MS} (one minute).`,
    );
  }

  return {
    ok: true,
    spec: {
      cronPattern: null,
      intervalMs,
      runAt: null,
      scheduleKind: 'interval',
    },
  };
};

const resolveOnce = (
  request: ScheduleSpecRequest,
  existing: ScheduledAgentJob | undefined,
  now: Date,
): ScheduleSpecResult => {
  if (!supplied(request.runAt)) {
    const runAt = existing?.runAt ?? null;
    if (runAt === null) {
      return fail('A run-once schedule needs runAt, an ISO 8601 time.');
    }
    return {
      ok: true,
      spec: {
        cronPattern: null,
        intervalMs: null,
        runAt,
        scheduleKind: 'once',
      },
    };
  }

  const runAt = parseRunAtWithOffset(request.runAt);
  if (runAt === null) {
    return fail(
      'runAt must be an ISO 8601 time with an offset, e.g. 2026-11-03T09:00:00-08:00 or 2026-11-03T17:00:00Z.',
    );
  }

  // Re-saving an unchanged time is fine even once it has passed; a new time must be in the future.
  const isUnchanged = existing?.runAt?.getTime() === runAt.getTime();
  if (!isUnchanged && runAt.getTime() <= now.getTime()) {
    return fail('runAt must be in the future.');
  }

  return {
    ok: true,
    spec: { cronPattern: null, intervalMs: null, runAt, scheduleKind: 'once' },
  };
};

/**
 * @description Resolves and validates a schedule's kind and timing. On update, `existing` fills in
 * whatever the request leaves out, so a partial patch (a new interval, say) keeps the rest.
 */
export const resolveScheduleSpec = (
  request: ScheduleSpecRequest,
  existing: ScheduledAgentJob | undefined,
  now: Date = new Date(),
): ScheduleSpecResult => {
  const kind = resolveKind(request.scheduleKind, existing?.scheduleKind);
  if (kind === null) {
    return fail(
      `Unknown schedule kind "${request.scheduleKind ?? ''}"; expected one of ${SCHEDULED_AGENT_JOB_SCHEDULE_KINDS.join(', ')}.`,
    );
  }

  switch (kind) {
    case 'cron':
      return resolveCron(request, existing);
    case 'interval':
      return resolveInterval(request, existing);
    case 'once':
      return resolveOnce(request, existing, now);
  }
};
