/**
 * @description Standalone module for {@link PlanEnqueueService} — the shared plan-run enqueue
 * pipeline (run row + plan/task status in one transaction, then the BullMQ add). Split out from
 * {@link PlansGraphqlModule}, like {@link PlanStatusModule}, so the plans worker can enqueue a
 * usage-limit continuation through the same pipeline without importing the GraphQL resolver surface;
 * {@link PlansGraphqlModule} imports this module too, for the enqueue mutations.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { NotificationsModule } from '../../../notifications/notifications.module.ts';
import { PlansQueueProducerModule } from '../../../queues/plans/producer/producer.module.ts';
import { QueuesServiceModule } from '../../queues/queues-service/queues-service.module.ts';
import { WorkLedgerGraphqlModule } from '../../work-ledger/work-ledger.module.ts';
import { PlanStatusModule } from '../plan-status/plan-status.module.ts';
import { PlanEnqueueService } from './plan-enqueue.service.ts';

@Module({
  exports: [PlanEnqueueService],
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    NotificationsModule,
    PlanStatusModule,
    PlansQueueProducerModule,
    QueuesServiceModule,
    WorkLedgerGraphqlModule,
  ],
  providers: [PlanEnqueueService],
})
export class PlanEnqueueModule {}
