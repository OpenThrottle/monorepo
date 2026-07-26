import type { Job } from 'bullmq';

/** @description Empty payload for the scheduled stale-plan-run sweep. */
export interface PlanRunsStaleSweepJobData {
  /* No payload needed for scheduled run */
}

export type PlanRunsStaleSweepJob = Job<PlanRunsStaleSweepJobData, void>;

/** @description Outcome of a sweep over stale (IN_PROGRESS, heartbeat past cutoff) plan runs. */
export interface PlanRunsStaleSweepSummary {
  /** Stale runs examined this sweep. */
  readonly examined: number;
  /** Plans reset to PENDING because a stale run stranded them (no other live run). */
  readonly reconciledPlans: number;
  /** Runs settled to STALE (location cleared). */
  readonly swept: number;
}
