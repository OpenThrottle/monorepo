/**
 * @description Types for the data-retention sweep: the policy contract each
 * table's retention rule implements, and the per-policy / per-sweep summaries.
 */

import type { Job } from 'bullmq';
import type { DataSource } from 'typeorm';

/** @description Empty payload — the sweep takes its scope from the policy list. */
export interface DataRetentionJobData {
  /* No payload needed for a scheduled run */
}

export type DataRetentionJob = Job<DataRetentionJobData, void>;

/**
 * @description One table's retention rule.
 *
 * Split into count and delete halves so the sweep can run in dry-run mode —
 * reporting exactly what it would remove — without touching a row. Enforcement
 * is opt-in (see data-retention.env.ts), so `countExpired` is the path that runs
 * by default and must stay side-effect free.
 */
export interface RetentionPolicy {
  /** Rows currently past retention. Must not modify any row. */
  readonly countExpired: (dataSource: DataSource) => Promise<number>;
  /**
   * Delete at most `limit` expired rows. Returns the number actually deleted;
   * the caller keeps calling until it returns less than `limit`, so this must
   * make progress on every call or the sweep stops on the batch cap.
   */
  readonly deleteBatch: (
    dataSource: DataSource,
    limit: number,
  ) => Promise<number>;
  /** Human-readable statement of the rule, surfaced in logs and docs. */
  readonly description: string;
  /** Stable identifier, used in log lines and per-policy summaries. */
  readonly name: string;
  /** Primary table the policy prunes, for operator-facing output. */
  readonly table: string;
}

/** @description Outcome of applying one policy during a sweep. */
export interface RetentionPolicyResult {
  /** True when the policy hit the per-sweep batch cap with work still pending. */
  readonly cappedOut: boolean;
  /** Rows actually deleted (always 0 in dry-run mode). */
  readonly deleted: number;
  /** Rows found past retention before deleting anything. */
  readonly expired: number;
  readonly policy: string;
  readonly table: string;
}

/** @description Outcome of one full sweep across every registered policy. */
export interface DataRetentionSweepSummary {
  /** False when the sweep only counted rows and deleted nothing. */
  readonly enforced: boolean;
  readonly results: readonly RetentionPolicyResult[];
  readonly totalDeleted: number;
  readonly totalExpired: number;
}
