import type { Job } from 'bullmq';

/** @description Empty payload for the scheduled abandoned-session sweep. */
export interface WorkLedgerSweepJobData {
  /* No payload needed for scheduled run */
}

export type WorkLedgerSweepJob = Job<WorkLedgerSweepJobData, void>;

/** @description Outcome of a sweep over abandoned (open, past-TTL) work sessions. */
export interface WorkLedgerSweepSummary {
  /** Sessions examined (open + past TTL) this sweep. */
  readonly examined: number;
  /** Sessions closed with closed_by='sweeper'. */
  readonly swept: number;
}
