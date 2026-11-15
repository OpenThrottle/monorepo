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

/**
 * @description What {@link PlanEnqueueService.materializeScheduleOccurrence} did. Never thrown: a
 * recurring schedule's chain must survive every one of these.
 * - `materialized`: the SCHEDULED run and its delayed job exist; `planStatusMoved` says whether the
 *   plan went to SCHEDULED (it does only from PENDING/BACKLOG; an active plan keeps its status).
 * - `already_materialized`: a run with this slot's deterministic job id already exists (any status).
 * - `plan_has_scheduled_run`: the plan already holds its one SCHEDULED run (a user one-off, or another
 *   schedule's occurrence); nothing was written, and the chain resumes when that run settles.
 * - `beyond_horizon` / `not_future`: the slot is past the 30-day horizon or not strictly in the future.
 * - `plan_not_found`, `unpreparable`: the plan is gone, or its run could not be resolved (workspace,
 *   backend or hooks no longer valid); `reason` is human-readable.
 */
export type MaterializeOccurrenceOutcome =
  | { readonly kind: 'already_materialized'; readonly planRunId: string }
  | { readonly kind: 'beyond_horizon' }
  | {
      readonly executionBackend: PlanRunExecutionBackend;
      readonly jobId: string;
      readonly kind: 'materialized';
      readonly planId: string;
      readonly planRunId: string;
      readonly planStatusMoved: boolean;
      readonly scheduledFor: Date;
    }
  | { readonly kind: 'not_future' }
  | {
      readonly kind: 'plan_has_scheduled_run';
      readonly planRunId: string | null;
    }
  | { readonly kind: 'plan_not_found' }
  | { readonly kind: 'unpreparable'; readonly reason: string };
