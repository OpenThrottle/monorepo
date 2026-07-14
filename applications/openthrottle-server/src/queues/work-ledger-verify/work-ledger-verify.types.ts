import type { Job } from 'bullmq';

/** @description Empty payload for the scheduled work-ledger verification sweep. */
export interface WorkLedgerVerifyJobData {
  /* No payload needed for scheduled run */
}

export type WorkLedgerVerifyJob = Job<WorkLedgerVerifyJobData, void>;

/** @description Outcome of a verification sweep over not-yet-landed git_commit artifacts. */
export interface WorkLedgerVerifySummary {
  /** Artifacts examined this sweep. */
  examined: number;
  /** Artifacts promoted to lifecycle='landed' (reachable on the default branch, directly or via squash). */
  landed: number;
  /** Artifacts marked orphaned (commit unfindable past the grace window). */
  orphaned: number;
  /** Artifacts left as-is (commit not found yet but within grace, verified-not-landed, or malformed). */
  pending: number;
  /** Artifacts promoted unverified → verified (commit confirmed to exist) but not yet landed. */
  verified: number;
}
