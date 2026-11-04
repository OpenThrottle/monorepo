/**
 * @description Standalone module for {@link PlanStatusService} — the sole legal writer of
 * `plans.status` (the applyStatusChange chokepoint). Split out from {@link PlansGraphqlModule} so
 * background BullMQ processors (the plans worker, the stale-run sweeper) can inject it without
 * pulling in the whole GraphQL resolver surface; {@link PlansGraphqlModule} imports this module
 * too, for the GraphQL mutations.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { PlansQueueProducerModule } from '../../queues/plans/plans-queue-producer.module.ts';
import { WorkLedgerGraphqlModule } from '../work-ledger/work-ledger-graphql.module.ts';
import { PlanStatusService } from './plan-status.service.ts';

@Module({
  exports: [PlanStatusService],
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    NotificationsModule,
    PlansQueueProducerModule,
    WorkLedgerGraphqlModule,
  ],
  providers: [PlanStatusService],
})
export class PlanStatusModule {}
