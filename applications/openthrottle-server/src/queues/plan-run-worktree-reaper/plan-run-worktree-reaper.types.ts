import type { Job } from 'bullmq';

/** @description Empty payload for the scheduled plan-run worktree sweep. */
export interface PlanRunWorktreeReaperJobData {
  /* No payload needed for scheduled run */
}

export type PlanRunWorktreeReaperJob = Job<PlanRunWorktreeReaperJobData, void>;
