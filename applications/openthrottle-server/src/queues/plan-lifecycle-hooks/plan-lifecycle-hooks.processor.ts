/**
 * @description BullMQ worker for plan/task lifecycle hook child jobs.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  PlanOutputStreamRepository,
  PlansRepository,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';

import {
  PLAN_LIFECYCLE_HOOKS_QUEUE_NAME,
  PLAN_LIFECYCLE_HOOKS_WORKER_CONCURRENCY,
} from './plan-lifecycle-hooks.constants.ts';
import type {
  PlanLifecycleHookJob,
  PlanLifecycleHookJobResult,
} from './plan-lifecycle-hooks.types.ts';
import { executeSinglePlanLifecycleHook } from './plan-lifecycle-hooks.utils.ts';

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
    private readonly planOutputStreamRepository: PlanOutputStreamRepository,
    private readonly plansRepository: PlansRepository,
    private readonly tasksRepository: TasksRepository,
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
      planOutputStreamRepository: this.planOutputStreamRepository,
      plansRepository: this.plansRepository,
      task: data.task,
      taskOutcome: data.taskOutcome,
      tasksRepository: this.tasksRepository,
    });
  }
}
