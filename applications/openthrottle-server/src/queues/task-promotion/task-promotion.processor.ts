/**
 * @description BullMQ worker for task-promotion:promote. One job = one promotion:
 * it delegates to {@link TaskPromotionService}, which creates the new plan, carries
 * tags, seeds an initial task, closes out the source task, and records work-ledger
 * provenance — all idempotent on at-least-once redelivery.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import {
  TASK_PROMOTION_QUEUE_NAME,
  TASK_PROMOTION_WORKER_CONCURRENCY,
} from './task-promotion.constants';
import { TaskPromotionService } from './task-promotion.service';
import type {
  PromoteTaskJob,
  PromoteTaskJobResult,
} from './task-promotion.types';

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
