import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ScheduledAgentJobWebhookDeliveriesRepository } from './scheduled-agent-job-webhook-deliveries.repository.ts';
import { ScheduledAgentJobWebhookDelivery } from './scheduled-agent-job-webhook-delivery.entity.ts';

/**
 * @description Registers {@link ScheduledAgentJobWebhookDelivery} on the default connection and
 * provides {@link ScheduledAgentJobWebhookDeliveriesRepository}.
 * @public
 */
@Module({
  exports: [ScheduledAgentJobWebhookDeliveriesRepository],
  imports: [TypeOrmModule.forFeature([ScheduledAgentJobWebhookDelivery])],
  providers: [ScheduledAgentJobWebhookDeliveriesRepository],
})
export class ScheduledAgentJobWebhookDeliveriesModule {}
