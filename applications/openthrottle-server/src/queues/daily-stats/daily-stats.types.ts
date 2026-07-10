import type { Job } from 'bullmq';

/** @description Empty job payload for scheduled daily stats aggregation. */
export interface AggregateDailyStatsJobData {
  /* No payload needed for scheduled run */
}

export type AggregateDailyStatsJob = Job<AggregateDailyStatsJobData, void>;

/** @description Outcome of a catch-up backfill batch over a UTC ymd window. */
export interface CatchUpSummary {
  /** Days that were (re)aggregated and upserted, chronological. */
  readonly backfilled: string[];
  /** Inclusive window start (ymd). */
  readonly from: string;
  /** Days already present and left untouched, chronological. */
  readonly skipped: string[];
  /** Inclusive window end (ymd) — yesterday (UTC). */
  readonly to: string;
}

/** @description Aggregated counts for a single calendar day (UTC). */
export interface DailyStatsAggregate {
  readonly date: string;
  readonly plansByStatus: Record<string, number>;
  readonly plansCompleted: number;
  readonly plansCreated: number;
  readonly plansUpdated: number;
  readonly tasksByStatus: Record<string, number>;
  readonly tasksCompleted: number;
  readonly tasksCreated: number;
  readonly tasksUpdated: number;
}
