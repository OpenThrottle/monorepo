/**
 * @description The interval and once schedule kinds, as pure functions.
 *
 * A cron schedule is a BullMQ job scheduler. Interval and once are not: BullMQ's own `every` repeat
 * counts from the previous slot, not from the previous fire's completion. So each pending interval or
 * once fire is ONE delayed job carrying its own slot (`ScheduledAgentJobPayload.slotMs`). An interval
 * fire re-arms the next one when it finishes; a once fire arms nothing.
 *
 * Interval arithmetic is elapsed milliseconds on epoch time, never wall-clock fields, so a DST change
 * can neither shift nor double a fire. A fire the server was down for keeps its slot and runs once,
 * late: the misfire policy is a cron concept and does not apply here.
 */

import type {
  ScheduledAgentJob,
  ScheduledAgentJobScheduleKind,
} from '@openthrottle/nestjs-repositories';

/** The shortest interval a schedule may set (T3 Code's floor too): a minute. */
export const SCHEDULED_AGENT_JOB_MIN_INTERVAL_MS = 60_000;

/** The kinds that arm their own delayed job instead of registering a BullMQ job scheduler. */
type SelfScheduledKind = Exclude<ScheduledAgentJobScheduleKind, 'cron'>;

/** @description Whether a schedule kind arms its own delayed job (interval, once) rather than cron. */
export const isSelfScheduledKind = (
  kind: unknown,
): kind is SelfScheduledKind => {
  return kind === 'interval' || kind === 'once';
};

/** Inputs to {@link nextSelfScheduledSlot}. */
export interface NextSelfScheduledSlotInput {
  /**
   * When the previous fire finished, for an interval schedule. Null means none is known (a new
   * schedule, or the chain was broken by a crash), and the interval counts from `now`.
   */
  readonly lastFinishedAt: Date | null;
  readonly now: Date;
}

/**
 * @description The slot the schedule's next fire is due at, or null when it has none: a cron
 * schedule, or a kind missing its field. A slot in the past is still returned; the fire then runs
 * once, late.
 */
export const nextSelfScheduledSlot = (
  job: Pick<ScheduledAgentJob, 'intervalMs' | 'runAt' | 'scheduleKind'>,
  input: NextSelfScheduledSlotInput,
): Date | null => {
  if (job.scheduleKind === 'once') return job.runAt;

  if (job.scheduleKind !== 'interval' || job.intervalMs === null) return null;

  const anchor = input.lastFinishedAt ?? input.now;

  return new Date(anchor.getTime() + job.intervalMs);
};

/**
 * @description The BullMQ job id for a schedule's fire at `slot`. Derived from both, so arming the
 * same slot twice is a no-op. BullMQ rejects a custom id containing `:`.
 */
export const selfScheduledFireJobId = (
  scheduleId: string,
  slot: Date,
): string => {
  return `scheduled-job-fire-${scheduleId}-${slot.getTime()}`;
};
