import type { ScheduledAgentJobMisfirePolicy } from '@openthrottle/nestjs-repositories';

/** Inputs to {@link shouldRunLateFire}. */
export interface LateFireInput {
  readonly latenessMs: number;
  readonly policy: ScheduledAgentJobMisfirePolicy;
  readonly thresholdMs: number;
}

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

/** Inputs to the missed-run messages. */
export interface MissedMessageInput {
  readonly policy: ScheduledAgentJobMisfirePolicy;
  readonly thresholdMs: number;
}

/** Inputs to {@link missedOnPickupMessage}. */
export interface MissedOnPickupMessageInput extends MissedMessageInput {
  readonly latenessMs: number;
}
