import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { ScheduledAgentJobCancellationService } from './scheduled-agent-job-cancellation.service';
import { ScheduledAgentJobSchedulerService } from './scheduled-agent-job-scheduler.service';
import { SCHEDULED_AGENT_JOBS_QUEUE_NAME } from './scheduled-agent-jobs.constants';

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
    ScheduledAgentJobSchedulerService,
  ],
  imports: [
    LoggerModule,
    NestjsBullmqModule.registerQueue(SCHEDULED_AGENT_JOBS_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(SCHEDULED_AGENT_JOBS_QUEUE_NAME),
  ],
  providers: [
    ScheduledAgentJobCancellationService,
    ScheduledAgentJobSchedulerService,
  ],
})
export class ScheduledAgentJobsQueueProducerModule {}
