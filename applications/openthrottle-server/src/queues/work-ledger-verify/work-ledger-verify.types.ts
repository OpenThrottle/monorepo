import type { Job } from 'bullmq';

/** @description Empty payload for the scheduled work-ledger verification sweep. */
export interface WorkLedgerVerifyJobData {
  /* No payload needed for scheduled run */
}

export type WorkLedgerVerifyJob = Job<WorkLedgerVerifyJobData, void>;

/** @description Outcome of a verification sweep over unverified git_commit artifacts. */
export interface WorkLedgerVerifySummary {
  /** Artifacts examined this sweep. */
  readonly examined: number;
  /** Artifacts left unverified (commit not found on GitHub yet, or malformed). */
  readonly pending: number;
  /** Artifacts promoted unverified → verified (commit confirmed to exist). */
  readonly verified: number;
}
