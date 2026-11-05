/**
 * @description The misfire policy for scheduled agent jobs, as pure functions: what to do with a
 * cron fire that starts late, and how to account for the fires an outage swallowed.
 *
 * Why it is shaped this way (proven against a real Redis in
 * `scheduled-agent-jobs.misfire.integration.test.ts`): a BullMQ job scheduler holds exactly ONE
 * delayed job, so however many slots pass while the server is down, at most one overdue job
 * survives — and whether it runs or is silently deleted by the boot reconcile's re-upsert is a
 * boot-order race. So the policy cannot live in BullMQ. It lives in two places that agree:
 *
 * - The processor gates every scheduler fire on its own lateness (`Date.now() - slot`, the slot
 *   read from the job id), so a late fire obeys the policy whichever side wins the race.
 * - The boot reconcile walks the cron itself for the slots BullMQ never made a job for, records
 *   them as `missed`, and enqueues the one catch-up `catch_up_once` owes.
 *
 * A unique index on (job, scheduled_for) arbitrates between the two (migration 141).
 */

import type { ScheduledAgentJobMisfirePolicy } from '@openthrottle/nestjs-repositories';
import { defaultRepeatStrategy } from 'bullmq';

/** The smallest misfire threshold a job may set: below this, ordinary queue jitter trips it. */
export const SCHEDULED_AGENT_JOB_MISFIRE_MIN_THRESHOLD_MS = 60_000;

/** Default misfire threshold (T3 Code skips fixed-time runs more than 10 minutes late). */
export const SCHEDULED_AGENT_JOB_MISFIRE_DEFAULT_THRESHOLD_MS = 10 * 60_000;

/** How far back the boot reconcile looks for missed slots; older ones are not worth a row. */
export const SCHEDULED_AGENT_JOB_MISFIRE_LOOKBACK_MS = 7 * 24 * 60 * 60_000;

/** At most this many missed slots are recorded per job per boot (the most recent ones). */
export const SCHEDULED_AGENT_JOB_MISSED_RECORD_LIMIT = 50;

/** Safety bound on the cron walk, so a pathological pattern can never spin the boot. */
const MAX_CRON_STEPS = 100_000;

/** Prefix BullMQ puts on every job a job scheduler creates: `repeat:<schedulerId>:<slotMillis>`. */
const SCHEDULER_JOB_ID_PREFIX = 'repeat:';

/**
 * @description The cron slot (epoch ms) a BullMQ job-scheduler job was created for, read from its
 * id `repeat:<schedulerId>:<slotMillis>`, or null for any other job (run-now, resume, catch-up).
 */
export const slotMillisFromJobId = (
  jobId: string | null | undefined,
): number | null => {
  if (typeof jobId !== 'string' || !jobId.startsWith(SCHEDULER_JOB_ID_PREFIX)) {
    return null;
  }

  const millis = Number(jobId.slice(jobId.lastIndexOf(':') + 1));

  return Number.isSafeInteger(millis) && millis > 0 ? millis : null;
};

/** Inputs to {@link shouldRunLateFire}. */
export interface LateFireInput {
  readonly latenessMs: number;
  readonly policy: ScheduledAgentJobMisfirePolicy;
  readonly thresholdMs: number;
}

/**
 * @description Whether a single fire that started `latenessMs` after its slot should still run: always
 * within the threshold, and beyond it only under `catch_up_once`.
 */
export const shouldRunLateFire = (input: LateFireInput): boolean => {
  return (
    input.latenessMs <= input.thresholdMs || input.policy === 'catch_up_once'
  );
};

/** Inputs to {@link listCronSlotsBetween}. */
export interface CronSlotWindow {
  /** Exclusive lower bound. */
  readonly after: Date;
  /** Inclusive upper bound. */
  readonly before: Date;
  readonly cronPattern: string;
  /** Keep at most this many slots — the most recent. */
  readonly limit: number;
  readonly timezone: string | null;
}

/** The slots in a window, ascending, plus how many older ones were dropped by the limit. */
export interface CronSlots {
  readonly droppedCount: number;
  readonly slots: readonly Date[];
}

/**
 * @description Every cron slot in (after, before], ascending, keeping only the most recent `limit`.
 * Walks with BullMQ's own `defaultRepeatStrategy` — the function its job scheduler uses to pick the
 * next fire — so these are exactly the slots BullMQ would have fired, timezone and DST included.
 */
export const listCronSlotsBetween = (window: CronSlotWindow): CronSlots => {
  const end = window.before.getTime();
  const repeat = {
    pattern: window.cronPattern,
    ...(window.timezone ? { tz: window.timezone } : {}),
  };
  const kept: Date[] = [];
  let droppedCount = 0;
  let cursor = window.after.getTime();

  for (let step = 0; step < MAX_CRON_STEPS; step += 1) {
    const next = defaultRepeatStrategy(cursor, repeat);
    if (next === undefined || next > end || next <= cursor) break;

    kept.push(new Date(next));
    if (kept.length > window.limit) {
      kept.shift();
      droppedCount += 1;
    }
    cursor = next;
  }

  return { droppedCount, slots: kept };
};

/** Inputs to {@link planBootMisfire}. */
export interface BootMisfireInput {
  readonly now: Date;
  readonly policy: ScheduledAgentJobMisfirePolicy;
  /** Slots that came due while the server was down, ascending. */
  readonly slots: readonly Date[];
  readonly thresholdMs: number;
}

/** What the boot reconcile does with an outage's slots. */
export interface BootMisfirePlan {
  /** The one slot to run late, or null when the policy runs none. */
  readonly catchUpSlot: Date | null;
  /** Slots to record as missed because they were too late for the policy. */
  readonly lateSlots: readonly Date[];
  /** Slots to record as missed because a later slot of the same outage runs instead. */
  readonly supersededSlots: readonly Date[];
}

/**
 * @description Decides an outage's slots: at most ONE late run per outage, ever — the most recent
 * slot, when {@link shouldRunLateFire} allows it — with every earlier slot recorded as superseded.
 * When the policy runs none, the most recent slot is already beyond the threshold, so every slot is
 * recorded as late.
 */
export const planBootMisfire = (input: BootMisfireInput): BootMisfirePlan => {
  const latest = input.slots[input.slots.length - 1];
  if (latest === undefined) {
    return { catchUpSlot: null, lateSlots: [], supersededSlots: [] };
  }

  const runsLatest = shouldRunLateFire({
    latenessMs: input.now.getTime() - latest.getTime(),
    policy: input.policy,
    thresholdMs: input.thresholdMs,
  });

  if (runsLatest) {
    return {
      catchUpSlot: latest,
      lateSlots: [],
      supersededSlots: input.slots.slice(0, -1),
    };
  }

  return {
    catchUpSlot: null,
    lateSlots: [...input.slots],
    supersededSlots: [],
  };
};

/** @description A duration as "N min" when it is whole minutes, else "N s". */
export const formatMisfireDuration = (ms: number): string => {
  return ms % 60_000 === 0
    ? `${ms / 60_000} min`
    : `${Math.round(ms / 1_000)} s`;
};

/** @description Human label for a policy, as run history shows it. */
const policyLabel = (policy: ScheduledAgentJobMisfirePolicy): string => {
  return policy === 'skip' ? 'skip' : 'catch up once';
};

/** Inputs to the missed-run messages. */
export interface MissedMessageInput {
  readonly policy: ScheduledAgentJobMisfirePolicy;
  readonly thresholdMs: number;
}

/** @description Message on a slot the server was down for, too late to run under the policy. */
export const missedLateMessage = (input: MissedMessageInput): string => {
  return `Missed: the server was not running when this fire came due, and it is more than ${formatMisfireDuration(input.thresholdMs)} late (misfire policy: ${policyLabel(input.policy)}).`;
};

/** @description Message on a slot of an outage that a later late run stands in for. */
export const missedSupersededMessage = (input: MissedMessageInput): string => {
  return `Missed: the server was not running when this fire came due. An outage gets at most one late run, and a later fire stood in for this one (misfire policy: ${policyLabel(input.policy)}).`;
};

/** Inputs to {@link missedOnPickupMessage}. */
export interface MissedOnPickupMessageInput extends MissedMessageInput {
  readonly latenessMs: number;
}

/** @description Message on a fire the worker picked up too late to run under the policy. */
export const missedOnPickupMessage = (
  input: MissedOnPickupMessageInput,
): string => {
  return `Missed: this fire was picked up ${formatMisfireDuration(Math.round(input.latenessMs / 60_000) * 60_000)} after it came due, beyond the ${formatMisfireDuration(input.thresholdMs)} misfire threshold (misfire policy: ${policyLabel(input.policy)}).`;
};
