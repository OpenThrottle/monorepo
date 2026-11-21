import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { ScheduledAgentJobRunsModule } from '@openthrottle/nestjs-repositories-server';

import { ScheduledAgentJobCheckoutPathModule } from '../../../services/scheduled-agent-job-checkout-path/scheduled-agent-job-checkout-path.module.ts';
import { ScheduledAgentJobCancellationService } from '../cancellation/cancellation.service.ts';
import { ScheduledAgentJobRunEnqueueService } from '../run-enqueue/run-enqueue.service.ts';
import { SCHEDULED_AGENT_JOBS_QUEUE_NAME } from '../scheduled-agent-jobs.constants.ts';
import { ScheduledAgentJobSchedulerService } from '../scheduler/scheduler.service.ts';

/**
 * @description Producer half of the scheduled-agent-jobs queue: registerQueue (enqueue run-now +
 * scheduler upsert) + Bull Board listing + the {@link ScheduledAgentJobCancellationService}, no
 * WorkerHost. Safe under any PROCESS_ROLE; the processor lives in the queue module.
 *
 * The cancellation service is provided HERE (and imported by the processor module) so
 * `PROCESS_ROLE=all` resolves ONE shared instance for both the GraphQL cancel mutation and the
 * worker — mirroring `PlanRunCancellationService`.
 */
@Module({
  exports: [
    BullModule,
    ScheduledAgentJobCancellationService,
    ScheduledAgentJobRunEnqueueService,
    ScheduledAgentJobSchedulerService,
  ],
  imports: [
    LoggerModule,
    // For ScheduledAgentJobCheckoutPathService: the scheduler resolves a schedule's targeted
    // checkout to a directory when snapshotting the payload.
    ScheduledAgentJobRunsModule,
    ScheduledAgentJobCheckoutPathModule,
    NestjsBullmqModule.registerQueue(SCHEDULED_AGENT_JOBS_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(SCHEDULED_AGENT_JOBS_QUEUE_NAME),
  ],
  providers: [
    ScheduledAgentJobCancellationService,
    ScheduledAgentJobRunEnqueueService,
    ScheduledAgentJobSchedulerService,
  ],
})
export class ScheduledAgentJobsQueueProducerModule {}
