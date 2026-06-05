/**
 * @description BullMQ worker for plan/task lifecycle hook child jobs.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import {
  PlanOutputStreamService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import {
  PLAN_LIFECYCLE_HOOKS_WORKER_CONCURRENCY,
  PLAN_LIFECYCLE_HOOKS_QUEUE_NAME,
} from './plan-lifecycle-hooks.constants';
import { executeSinglePlanLifecycleHook } from './execute-single-plan-lifecycle-hook';
import type {
  PlanLifecycleHookJob,
  PlanLifecycleHookJobResult,
} from './plan-lifecycle-hooks.types';

@Processor(PLAN_LIFECYCLE_HOOKS_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: PLAN_LIFECYCLE_HOOKS_WORKER_CONCURRENCY,
})
export class PlanLifecycleHooksProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly logger: LoggerService,
    private readonly planOutputStreamService: PlanOutputStreamService,
    private readonly plansService: PlansService,
    private readonly tasksService: TasksService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Plan lifecycle hooks worker started (concurrency=${PLAN_LIFECYCLE_HOOKS_WORKER_CONCURRENCY})`,
      PlanLifecycleHooksProcessor.name,
    );
  }

  onApplicationShutdown(): Promise<void> {
    return this.worker.close();
  }

  async process(
    job: PlanLifecycleHookJob,
  ): Promise<PlanLifecycleHookJobResult> {
    const { data } = job;

    return executeSinglePlanLifecycleHook({
      entry: data.entry,
      hookIndex: data.hookIndex,
      jobData: data.planRunJobData,
      logLabel: PlanLifecycleHooksProcessor.name,
      logger: this.logger,
      mainRunStarted: data.mainRunStarted,
      mainRunSucceeded: data.mainRunSucceeded,
      phase: data.phase,
      planOutputStreamService: this.planOutputStreamService,
      plansService: this.plansService,
      task: data.task,
      taskOutcome: data.taskOutcome,
      tasksService: this.tasksService,
    });
  }
}
