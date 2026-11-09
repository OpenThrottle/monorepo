import type { PlanRunExecutionBackend } from '@openthrottle/nestjs-repositories';

import type { ScheduledPlanRunFireDecision } from '../../../queues/plans/scheduled-plan-run/scheduled-plan-run.types.ts';
import type { PLAN_SCHEDULE_CONFLICT_CODE } from './plan-enqueue.constants.ts';

/** @description Result of an enqueue: the persisted backend, job id, and live queue position. */
export interface EnqueueOutcome {
  readonly executionBackend: PlanRunExecutionBackend;
  readonly jobId: string;
  readonly planId: string;
  readonly queuePosition: number;
  readonly queueTotal: number;
}

/** @description Result of scheduling a run: the SCHEDULED row, its delayed job, and the instant it fires. */
export interface ScheduleOutcome {
  readonly executionBackend: PlanRunExecutionBackend;
  readonly jobId: string;
  readonly planId: string;
  readonly planRunId: string;
  readonly scheduledFor: Date;
}

/**
 * @description What {@link PlanEnqueueService.fireScheduledRun} did: the policy's decision, applied, or
 * `not_scheduled` when the run was no longer SCHEDULED (a concurrent cancel won, or it already fired)
 * and nothing was written.
 */
export type ScheduledRunFireOutcome =
  ScheduledPlanRunFireDecision | { readonly kind: 'not_scheduled' };

/** @description One of the D8 conflict codes in {@link PLAN_SCHEDULE_CONFLICT_CODE}. */
export type PlanScheduleConflictCode =
  (typeof PLAN_SCHEDULE_CONFLICT_CODE)[keyof typeof PLAN_SCHEDULE_CONFLICT_CODE];

/**
 * @description Whether a plan in `planStatus` may take a new scheduled run (D2), and if not, which
 * conflict code says why. A SCHEDULED plan already holds its one scheduled run (D3).
 */
export type PlanSchedulability =
  | { readonly kind: 'schedulable' }
  | {
      readonly code: PlanScheduleConflictCode;
      readonly kind: 'conflict';
      readonly message: string;
    };
