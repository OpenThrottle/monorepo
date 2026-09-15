import type { Job } from 'bullmq';

/** @description Empty payload for the scheduled work-ledger harvest sweep. */
export interface WorkLedgerHarvestJobData {
  /* No payload needed for scheduled run */
}

export type WorkLedgerHarvestJob = Job<WorkLedgerHarvestJobData, void>;

/** @description Outcome of a harvest sweep over eligible repositories. */
export interface WorkLedgerHarvestSummary {
  /** Trailer commits whose artifact already existed — the steady state once caught up. */
  alreadyRecorded: number;
  /** Repositories examined this sweep. */
  examined: number;
  /** Commits adopted as new git_commit artifacts. */
  harvested: number;
  /** Commits read whose message carried no Plan-Id: trailer. */
  skipped: number;
  /** Trailer references that matched no plan. */
  unresolved: number;
}
