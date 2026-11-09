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
/**
 * @description Reads `Plan-Id:` / `Task-Id:` trailers out of a commit message.
 *
 * These trailers are the only durable link between a landed commit and the plan it closed — the
 * commit carries them forever, while the session that produced it is long gone. Harvesting them is
 * what lets the ledger adopt work nobody recorded at the time.
 */

/** A plan (and optionally task) reference read off one commit message. */
export interface PlanTrailerRef {
  /** Raw trailer value: a full uuid, or a short prefix of one. */
  readonly planRef: string;
  /** Raw Task-Id: value paired with this plan, when the commit carried one. */
  readonly taskRef: string | null;
}
