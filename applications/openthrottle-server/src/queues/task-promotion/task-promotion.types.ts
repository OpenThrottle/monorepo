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
export interface PromoteTaskParams {
  /** Service-account id of the promoter, when the principal is a machine. */
  readonly actorServiceAccountId: string | null;
  /** User id of the promoter, when the principal is a human. */
  readonly actorUserId: string | null;
  /**
   * True to roll back the whole promotion when the source task's status_change capture fails
   * (the `promoteTaskToPlan` mutation path, via {@link TaskPromotionProcessor} — user-initiated);
   * false to log it and let the promotion commit anyway (the `promote-task-to-plan` tag-rule
   * automation, via {@link PromoteTaskToPlanExecutor} — background). Callers set this explicitly
   * per path rather than it being inferred from the actor fields, since both paths can supply a
   * resolvable actorUserId (the automation attributes to the plan owner, not a system account).
   */
  readonly captureFailureIsFatal: boolean;
  readonly taskId: string;
}

export interface PromoteTaskOutcome {
  /** The plan the task was promoted into, when promotion ran. */
  readonly newPlanId: string | null;
  /** Non-null when the job did nothing (task-missing | already-promoted). */
  readonly skipped: string | null;
}
