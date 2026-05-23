import type { Job } from 'bullmq';

/** @description Empty job payload for scheduled daily stats aggregation. */
export interface AggregateDailyStatsJobData {
  /* No payload needed for scheduled run */
}

export type AggregateDailyStatsJob = Job<AggregateDailyStatsJobData, void>;

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
