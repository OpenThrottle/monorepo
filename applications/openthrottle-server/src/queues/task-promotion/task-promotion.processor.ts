/**
 * @description BullMQ worker for task-promotion:promote. One job = one promotion:
 * it delegates to {@link TaskPromotionService}, which creates the new plan, carries
 * tags, seeds an initial task, closes out the source task, and records work-ledger
 * provenance — all idempotent on at-least-once redelivery.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';

import {
  TASK_PROMOTION_QUEUE_NAME,
  TASK_PROMOTION_WORKER_CONCURRENCY,
} from './task-promotion.constants.ts';
import { TaskPromotionService } from './task-promotion.service.ts';
import type {
  PromoteTaskJob,
  PromoteTaskJobResult,
} from './task-promotion.types.ts';

@Processor(TASK_PROMOTION_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: TASK_PROMOTION_WORKER_CONCURRENCY,
})
export class TaskPromotionProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly logger: LoggerService,
    private readonly taskPromotionService: TaskPromotionService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Task promotion worker started (concurrency=${TASK_PROMOTION_WORKER_CONCURRENCY})`,
      TaskPromotionProcessor.name,
    );
  }

  onApplicationShutdown(): Promise<void> {
    return this.worker.close();
  }

  async process(job: PromoteTaskJob): Promise<PromoteTaskJobResult> {
    const { actorServiceAccountId, actorUserId, taskId } = job.data;

    const outcome = await this.taskPromotionService.promote({
      actorServiceAccountId,
      actorUserId,
      // This queue is reached only from the promoteTaskToPlan GraphQL mutation
      // (TaskPromotionEnqueueService.enqueuePromotion) — a user-initiated write, same fatality
      // as the mutation's other chokepoints (PlanStatusService.cancelRun, PlanEnqueueService).
      captureFailureIsFatal: true,
      taskId,
    });

    if (outcome.skipped != null) {
      this.logger.info(
        `task-promotion:${job.name} no-op for task ${taskId} (${outcome.skipped})`,
        TaskPromotionProcessor.name,
      );
    }

    return outcome;
  }
}
