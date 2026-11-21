import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ScheduledAgentJobWebhookTrigger } from './scheduled-agent-job-webhook-trigger.entity.ts';
import { ScheduledAgentJobWebhookTriggersRepository } from './scheduled-agent-job-webhook-triggers.repository.ts';

/**
 * @description Registers {@link ScheduledAgentJobWebhookTrigger} on the default connection and
 * provides {@link ScheduledAgentJobWebhookTriggersRepository}.
 * @public
 */
@Module({
  exports: [ScheduledAgentJobWebhookTriggersRepository],
  imports: [TypeOrmModule.forFeature([ScheduledAgentJobWebhookTrigger])],
  providers: [ScheduledAgentJobWebhookTriggersRepository],
})
export class ScheduledAgentJobWebhookTriggersModule {}
