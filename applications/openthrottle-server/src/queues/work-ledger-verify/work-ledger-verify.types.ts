import type { Job } from 'bullmq';

/** @description Empty payload for the scheduled work-ledger verification sweep. */
export interface WorkLedgerVerifyJobData {
  /* No payload needed for scheduled run */
}

export type WorkLedgerVerifyJob = Job<WorkLedgerVerifyJobData, void>;

/** @description Outcome of a verification sweep over git_commit and pull_request artifacts. */
export interface WorkLedgerVerifySummary {
  /** pull_request artifacts advanced to lifecycle='closed' (closed without merging). */
  closed: number;
  /** git_commit artifacts examined this sweep. */
  examined: number;
  /** Artifacts promoted to lifecycle='landed' (reachable on the default branch, directly or via squash). */
  landed: number;
  /** pull_request artifacts advanced to lifecycle='merged'. */
  merged: number;
  /** Artifacts marked orphaned (commit unfindable past the grace window). */
  orphaned: number;
  /** Artifacts left as-is (commit not found yet but within grace, verified-not-landed, or malformed). */
  pending: number;
  /** pull_request artifacts examined this sweep. */
  pullRequestsExamined: number;
  /** Orphaned git_commit rows repaired from a merged sibling PR's merge_commit_sha. */
  repaired: number;
  /** Artifacts promoted unverified → verified (commit confirmed to exist) but not yet landed. */
  verified: number;
}
