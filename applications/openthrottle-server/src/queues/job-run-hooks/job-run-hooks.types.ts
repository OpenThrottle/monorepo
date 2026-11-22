import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanOutputStreamRepository,
  PlansRepository,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';
import type { JobRunHookPhase, JobRunHooksConfig } from '@tools/workflows';

import type { RunPlanJobData } from '../plans/plans.types.ts';
export type PlanQueueJobCompletedPayload = {
  readonly jobType: string;
  readonly message: string;
  readonly planId: string;
  readonly severity: 'error' | 'info' | 'success' | 'warning';
};

export interface PlanJobRunHooksServices {
  readonly emitQueueJobCompleted: (
    payload: PlanQueueJobCompletedPayload,
  ) => void;
}

export interface ExecutePlanJobRunHooksParams {
  readonly hooks: JobRunHooksConfig | undefined;
  readonly jobData: RunPlanJobData;
  readonly logLabel: string;
  readonly logger: LoggerService;
  readonly mainRunStarted?: boolean;
  readonly mainRunSucceeded?: boolean;
  readonly phase: JobRunHookPhase;
  readonly planOutputStreamRepository: PlanOutputStreamRepository;
  readonly plansRepository: PlansRepository;
  readonly signal?: AbortSignal;
  readonly task?: {
    readonly category: string | undefined;
    readonly id: string;
    readonly status: string;
    readonly title: string;
  };
  readonly taskOutcome?: 'blocked' | 'completed' | 'failed';
  readonly tasksRepository: TasksRepository;
}
