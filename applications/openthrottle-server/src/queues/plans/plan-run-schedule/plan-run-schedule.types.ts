import type { MaterializeOccurrenceOutcome } from '../../../graphql/plans/plan-enqueue/plan-enqueue.types.ts';

/** @description The instants a schedule's slots are computed from, and the zone they are read in. */
export interface PlanRunScheduleSlotQuery {
  readonly cronPattern: string;
  /** IANA timezone name; null means UTC. */
  readonly timezone: string | null;
}

/**
 * @description What one step of a schedule's chain did. The chain is best-effort: every outcome is a
 * value, never a throw, so a settle path can await it without a try/catch.
 * - `attempted`: a slot was computed and handed to the enqueue pipeline; `outcome` says what it did.
 * - `occurrence_exists`: the schedule already has its one SCHEDULED occurrence; nothing was done.
 * - `disabled` / `schedule_not_found` / `no_next_slot`: nothing to continue.
 * - `failed`: an unexpected error (logged); the next settle or boot reconcile retries.
 */
export type PlanRunScheduleChainResult =
  | {
      readonly kind: 'attempted';
      readonly outcome: MaterializeOccurrenceOutcome;
    }
  | { readonly kind: 'disabled' }
  | { readonly kind: 'failed'; readonly reason: string }
  | { readonly kind: 'no_next_slot' }
  | { readonly kind: 'occurrence_exists'; readonly planRunId: string }
  | { readonly kind: 'schedule_not_found' };

/** @description Extra context a settle hook passes to {@link PlanRunScheduleService.onScheduledRunSettled}. */
export interface PlanRunScheduleSettleOptions {
  /**
   * The occurrence that just settled MISSED. When it belongs to a `run_once` schedule, one catch-up
   * run is fired immediately instead of waiting for the next slot.
   */
  readonly missedRunScheduleId: string | null;
  /**
   * The settled occurrence's own slot. The next slot is computed strictly after the later of this and
   * `now`, so a job that fires a few milliseconds early can never re-materialize its own slot.
   */
  readonly settledSlot: Date | null;
}
