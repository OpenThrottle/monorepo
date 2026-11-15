import { CronExpressionParser } from 'cron-parser';

import type { CronValidationResult } from '../../../graphql/scheduled-agent-jobs/cron/cron.types.ts';
import { validateScheduledAgentJobCron } from '../../../graphql/scheduled-agent-jobs/cron/cron.utils.ts';
import {
  PLAN_RUN_SCHEDULE_INTERVAL_SAMPLE_SLOTS,
  PLAN_RUN_SCHEDULE_MIN_INTERVAL_MS,
} from './plan-run-schedule.constants.ts';
import type { PlanRunScheduleSlotQuery } from './plan-run-schedule.types.ts';

const UTC = 'UTC';

const describeError = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

/** @description True when `timezone` is an IANA zone name the runtime knows. */
const isValidTimezone = (timezone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });

    return true;
  } catch {
    return false;
  }
};

/**
 * @description The first slot of a cron pattern strictly after `after`, evaluated in `timezone`
 * (null = UTC) with cron-parser — the library BullMQ's own repeatables use — and returned as an
 * absolute instant, ready for `plan_runs.scheduled_for`. Wall-clock semantics follow cron-parser's
 * DST handling: `0 9 * * *` in America/New_York stays 09:00 local, so its UTC instant shifts by an
 * hour across a transition. Null when the pattern or zone is invalid or has no further slot.
 */
export const computeNextSlot = (
  params: PlanRunScheduleSlotQuery & { readonly after: Date },
): Date | null => {
  try {
    const expression = CronExpressionParser.parse(params.cronPattern, {
      currentDate: params.after,
      tz: params.timezone ?? UTC,
    });

    return expression.next().toDate();
  } catch {
    return null;
  }
};

/**
 * @description The latest slot of a cron pattern at or before `at`, or null when there is none (or the
 * pattern or zone is invalid). The mirror of {@link computeNextSlot}, used to find the occurrence a
 * `run_once` catch-up would stand in for.
 */
export const computePreviousSlot = (
  params: PlanRunScheduleSlotQuery & { readonly at: Date },
): Date | null => {
  try {
    // cron-parser's prev() is strictly before its current date; one millisecond on makes "at" count.
    const expression = CronExpressionParser.parse(params.cronPattern, {
      currentDate: new Date(params.at.getTime() + 1),
      tz: params.timezone ?? UTC,
    });

    return expression.prev().toDate();
  } catch {
    return null;
  }
};

/**
 * @description Validates a recurring schedule's cron pattern and zone. Rejects, in order:
 * 1. a pattern {@link validateScheduledAgentJobCron} rejects (field count, characters, sub-minute
 *    seconds, a bare every-minute pattern);
 * 2. a timezone that is not a known IANA name (null = UTC is always valid);
 * 3. a pattern cron-parser cannot parse or that has no upcoming slot;
 * 4. a pattern with two consecutive slots less than {@link PLAN_RUN_SCHEDULE_MIN_INTERVAL_MS} apart.
 *
 * The interval check samples the next {@link PLAN_RUN_SCHEDULE_INTERVAL_SAMPLE_SLOTS} slots from
 * `now` (consecutive pairs, in `timezone`, so DST transitions inside the sample count) rather than
 * proving the property for all time. `now` is injectable for tests.
 */
export const validatePlanRunScheduleCron = (
  cronPattern: string,
  timezone: string | null,
  now: Date = new Date(),
): CronValidationResult => {
  const structural = validateScheduledAgentJobCron(cronPattern);

  if (!structural.ok) {
    return structural;
  }

  if (timezone !== null && !isValidTimezone(timezone)) {
    return { ok: false, reason: `Unknown timezone "${timezone}".` };
  }

  try {
    const expression = CronExpressionParser.parse(cronPattern, {
      currentDate: now,
      tz: timezone ?? UTC,
    });
    let previous = expression.next().toDate();

    for (let i = 1; i < PLAN_RUN_SCHEDULE_INTERVAL_SAMPLE_SLOTS; i += 1) {
      const slot = expression.next().toDate();
      const gapMs = slot.getTime() - previous.getTime();

      if (gapMs < PLAN_RUN_SCHEDULE_MIN_INTERVAL_MS) {
        return {
          ok: false,
          reason: `Consecutive runs must be at least ${PLAN_RUN_SCHEDULE_MIN_INTERVAL_MS / 60_000} minutes apart; "${cronPattern}" fires ${Math.round(gapMs / 60_000)} minutes after ${previous.toISOString()}.`,
        };
      }

      previous = slot;
    }
  } catch (error) {
    return {
      ok: false,
      reason: `Could not read the cron pattern: ${describeError(error)}`,
    };
  }

  return { ok: true };
};
