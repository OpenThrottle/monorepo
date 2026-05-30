import type { Job } from 'bullmq';
import type {
  JobRunHookEntry,
  JobRunHookPhase,
  JobRunHookTaskContext,
  JobRunHookTaskOutcome,
} from '@tools/workflows';
import type { RunPlanJobData } from '../plans/plans.types';

/** @description Payload for one lifecycle hook child BullMQ job. */
export interface PlanLifecycleHookJobData {
  readonly entry: JobRunHookEntry;
  readonly hookIndex: number;
  readonly mainRunStarted?: boolean;
  readonly mainRunSucceeded?: boolean;
  readonly parentJobId: string;
  readonly parentQueueName: string;
  readonly phase: JobRunHookPhase;
  readonly planId: string;
  readonly planRunJobData: RunPlanJobData;
  readonly task?: JobRunHookTaskContext;
  readonly taskOutcome?: JobRunHookTaskOutcome;
}

/** @description Return value stored on the child job when the hook finishes. */
export interface PlanLifecycleHookJobResult {
  readonly blocked: boolean;
  readonly ok: boolean;
}

export type PlanLifecycleHookJob = Job<
  PlanLifecycleHookJobData,
  PlanLifecycleHookJobResult
>;
