import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  ScheduledAgentJobRunsModule,
  ScheduledAgentJobsModule,
  ScheduledAgentJobWebhookDeliveriesModule,
  ScheduledAgentJobWebhookTriggersModule,
} from '@openthrottle/nestjs-repositories-server';

import { ScheduledAgentJobsQueueProducerModule } from '../../queues/scheduled-agent-jobs/producer/producer.module.ts';
import { AgentJobWebhooksController } from './agent-job-webhooks.controller.ts';
import { AgentJobWebhooksService } from './agent-job-webhooks.service.ts';

/**
 * @description The public webhook ingress for scheduled agent jobs. Imports the queue PRODUCER
 * module for the shared run-enqueue path, so it loads under any role that serves HTTP.
 */
@Module({
  controllers: [AgentJobWebhooksController],
  imports: [
    LoggerModule,
    ScheduledAgentJobRunsModule,
    ScheduledAgentJobsModule,
    ScheduledAgentJobsQueueProducerModule,
    ScheduledAgentJobWebhookDeliveriesModule,
    ScheduledAgentJobWebhookTriggersModule,
  ],
  providers: [AgentJobWebhooksService],
})
export class AgentJobWebhooksModule {}
