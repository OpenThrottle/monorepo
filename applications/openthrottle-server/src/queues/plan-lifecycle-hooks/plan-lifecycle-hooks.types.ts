import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanOutputStreamService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type {
  JobRunHookEntry,
  JobRunHookPhase,
  JobRunHookTaskContext,
  JobRunHookTaskOutcome,
} from '@tools/workflows';
import type { Job } from 'bullmq';

import type { RunPlanJobData } from '../plans/plans.types.ts';

/**
 * Payload for one lifecycle hook child BullMQ job.
 */
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

/**
 * Return value stored on the child job when the hook finishes.
 */
export interface PlanLifecycleHookJobResult {
  readonly blocked: boolean;
  readonly ok: boolean;
}

export type PlanLifecycleHookJob = Job<
  PlanLifecycleHookJobData,
  PlanLifecycleHookJobResult
>;
export interface ExecuteSinglePlanLifecycleHookParams {
  readonly entry: JobRunHookEntry;
  readonly hookIndex: number;
  readonly jobData: RunPlanJobData;
  readonly logLabel: string;
  readonly logger: LoggerService;
  readonly mainRunStarted?: boolean;
  readonly mainRunSucceeded?: boolean;
  readonly phase: JobRunHookPhase;
  readonly planOutputStreamService: PlanOutputStreamService;
  readonly plansService: PlansService;
  readonly signal?: AbortSignal;
  readonly task?: JobRunHookTaskContext;
  readonly taskOutcome?: JobRunHookTaskOutcome;
  readonly tasksService: TasksService;
}
