/**
 * @description Job payload + result for task-promotion:promote.
 */

import type { Job } from 'bullmq';

export interface PromoteTaskJobData {
  /** Service-account id of the promoter, when the principal is a machine. */
  readonly actorServiceAccountId: string | null;
  /** User id of the promoter, when the principal is a human. */
  readonly actorUserId: string | null;
  /** Dedupe key so re-submitted mutations enqueue at most one job. */
  readonly idempotencyKey: string;
  readonly taskId: string;
}

export interface PromoteTaskJobResult {
  /** Id of the plan the task was promoted into, when promotion ran. */
  readonly newPlanId: string | null;
  /** Why the job did nothing (e.g. already promoted), null when it ran. */
  readonly skipped: string | null;
}

export type PromoteTaskJob = Job<PromoteTaskJobData, PromoteTaskJobResult>;
