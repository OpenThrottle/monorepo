/**
 * @description Enqueues and awaits Jest-style lifecycle hooks as BullMQ child jobs of a plan run.
 */

import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  WorkflowLifecycleDispatcher,
  WorkflowLifecycleTaskContext,
  WorkflowLifecycleTaskOutcome,
  WorkflowPlanLifecyclePhase,
  WorkflowTaskLifecyclePhase,
} from '@openthrottle/openthrottle-agentic-workflow';
import {
  isPlanScopedJobRunHookPhase,
  isTaskScopedJobRunHookPhase,
  shouldRunJobRunHook,
  sortJobRunHookEntries,
  type JobRunHookPhase,
  type JobRunHookRunKind,
  type JobRunHooksConfig,
} from '@tools/workflows';
import { Queue, QueueEvents } from 'bullmq';
import type { RunPlanJobData } from '../plans/plans.types';
import { isRunPlanOrchestratorJobData } from '../plans/plans.types';
import {
  PLAN_LIFECYCLE_HOOK_JOB_NAME,
  PLAN_LIFECYCLE_HOOKS_QUEUE_NAME,
} from './plan-lifecycle-hooks.constants';
import type {
  PlanLifecycleHookJobData,
  PlanLifecycleHookJobResult,
} from './plan-lifecycle-hooks.types';

export interface CreateWorkflowLifecycleDispatcherParams {
  readonly hooks: JobRunHooksConfig | undefined;
  readonly parentJobId: string;
  readonly parentQueueName: string;
  readonly planRunJobData: RunPlanJobData;
  readonly signal?: AbortSignal;
}

const runKindFromJobData = (jobData: RunPlanJobData): JobRunHookRunKind =>
  isRunPlanOrchestratorJobData(jobData) ? 'orchestrator' : 'spawn';

/**
 * @description Factory for a per-plan-run {@link WorkflowLifecycleDispatcher} backed by BullMQ child jobs.
 */
@Injectable()
export class WorkflowLifecycleDispatcherFactory
  implements OnModuleInit, OnApplicationShutdown
{
  private queueEvents: QueueEvents | undefined;

  constructor(
    private readonly logger: LoggerService,
    @InjectQueue(PLAN_LIFECYCLE_HOOKS_QUEUE_NAME)
    private readonly lifecycleHooksQueue: Queue<
      PlanLifecycleHookJobData,
      PlanLifecycleHookJobResult
    >,
  ) {}

  async onModuleInit(): Promise<void> {
    this.queueEvents = new QueueEvents(PLAN_LIFECYCLE_HOOKS_QUEUE_NAME, {
      connection: this.lifecycleHooksQueue.opts.connection,
      // Reuse the injected queue's environment-scoped prefix so these events
      // observe the same keyspace the producer writes to.
      prefix: this.lifecycleHooksQueue.opts.prefix,
    });

    await this.queueEvents.waitUntilReady();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.queueEvents?.close();
  }

  /**
   * @description Builds a dispatcher bound to one parent plan-run job.
   */
  create(
    params: CreateWorkflowLifecycleDispatcherParams,
  ): WorkflowLifecycleDispatcher {
    const hooks = params.hooks?.hooks ?? [];
    const sorted = sortJobRunHookEntries(hooks);
    const runKind = runKindFromJobData(params.planRunJobData);

    const runPhaseEntries = async (phaseParams: {
      readonly mainRunStarted?: boolean;
      readonly mainRunSucceeded?: boolean;
      readonly phase: JobRunHookPhase;
      readonly task?: WorkflowLifecycleTaskContext;
      readonly taskOutcome?: WorkflowLifecycleTaskOutcome;
    }): Promise<{ readonly blocked: boolean }> => {
      if (sorted.length === 0) {
        return { blocked: false };
      }

      let hookIndex = 0;
      let blocked = false;

      for (const entry of sorted) {
        const context = {
          mainRunStarted: phaseParams.mainRunStarted ?? true,
          mainRunSucceeded: phaseParams.mainRunSucceeded ?? false,
          phase: phaseParams.phase,
          runKind,
          ...(phaseParams.task !== undefined ? { task: phaseParams.task } : {}),
          ...(phaseParams.taskOutcome !== undefined
            ? { taskOutcome: phaseParams.taskOutcome }
            : {}),
        };

        if (!shouldRunJobRunHook(entry, context)) {
          continue;
        }

        if (this.queueEvents === undefined) {
          throw new Error(
            'Plan lifecycle hooks QueueEvents is not initialized',
          );
        }

        const jobData: PlanLifecycleHookJobData = {
          entry,
          hookIndex,
          mainRunStarted: phaseParams.mainRunStarted,
          mainRunSucceeded: phaseParams.mainRunSucceeded,
          parentJobId: params.parentJobId,
          parentQueueName: params.parentQueueName,
          phase: phaseParams.phase,
          planId: params.planRunJobData.planId,
          planRunJobData: params.planRunJobData,
          ...(phaseParams.task !== undefined ? { task: phaseParams.task } : {}),
          ...(phaseParams.taskOutcome !== undefined
            ? { taskOutcome: phaseParams.taskOutcome }
            : {}),
        };

        // eslint-disable-next-line no-await-in-loop
        const job = await this.lifecycleHooksQueue.add(
          PLAN_LIFECYCLE_HOOK_JOB_NAME,
          jobData,
          {
            parent: {
              id: params.parentJobId,
              queue: params.parentQueueName,
            },
          },
        );

        // eslint-disable-next-line no-await-in-loop
        const result = await job.waitUntilFinished(this.queueEvents);

        hookIndex += 1;

        if (result.blocked) {
          blocked = true;
          break;
        }

        if (!result.ok && entry.onFailure === 'block') {
          if (
            phaseParams.phase === 'beforeAll' ||
            phaseParams.phase === 'beforeEach'
          ) {
            blocked = true;
            break;
          }
        }
      }

      return { blocked };
    };

    return {
      runPlan: async (runPlanParams: {
        readonly mainRunStarted?: boolean;
        readonly mainRunSucceeded?: boolean;
        readonly phase: WorkflowPlanLifecyclePhase;
      }): Promise<{ readonly blocked: boolean }> => {
        if (!isPlanScopedJobRunHookPhase(runPlanParams.phase)) {
          return { blocked: false };
        }

        if (params.signal?.aborted) {
          return { blocked: false };
        }

        return runPhaseEntries({
          mainRunStarted: runPlanParams.mainRunStarted,
          mainRunSucceeded: runPlanParams.mainRunSucceeded,
          phase: runPlanParams.phase,
        });
      },

      runTask: async (runTaskParams: {
        readonly phase: WorkflowTaskLifecyclePhase;
        readonly task: WorkflowLifecycleTaskContext;
        readonly taskOutcome?: WorkflowLifecycleTaskOutcome;
      }): Promise<{ readonly blocked: boolean }> => {
        if (!isTaskScopedJobRunHookPhase(runTaskParams.phase)) {
          return { blocked: false };
        }

        if (params.signal?.aborted) {
          return { blocked: false };
        }

        return runPhaseEntries({
          phase: runTaskParams.phase,
          task: runTaskParams.task,
          taskOutcome: runTaskParams.taskOutcome,
        });
      },
    };
  }
}
