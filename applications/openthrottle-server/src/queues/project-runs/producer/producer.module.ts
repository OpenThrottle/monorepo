import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { PlanRunsModule } from '@openthrottle/nestjs-repositories-server';

import { ProjectRunsEnqueueService } from '../enqueue/enqueue.service.ts';
import { PROJECT_RUNS_QUEUE_NAME } from '../project-runs.constants.ts';

/**
 * @description Producer half of the project-runs queue: registerQueue, Bull Board listing, and
 * {@link ProjectRunsEnqueueService} (the best-effort advance trigger every plan-run settle calls).
 * Safe under any PROCESS_ROLE; the processor and the reconcile repeatable live in
 * ProjectRunsQueueModule.
 */
@Module({
  exports: [BullModule, ProjectRunsEnqueueService],
  imports: [
    LoggerModule,
    NestjsBullmqModule.registerQueue(PROJECT_RUNS_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(PROJECT_RUNS_QUEUE_NAME),
    PlanRunsModule,
  ],
  providers: [ProjectRunsEnqueueService],
})
export class ProjectRunsQueueProducerModule {}
