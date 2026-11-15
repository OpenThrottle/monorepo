import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { PlanEnqueueModule } from '../../../graphql/plans/plan-enqueue/plan-enqueue.module.ts';
import { WorkLedgerGraphqlModule } from '../../../graphql/work-ledger/work-ledger.module.ts';
import { PlanRunScheduleService } from './plan-run-schedule.service.ts';

/**
 * @description Provides {@link PlanRunScheduleService}. A leaf module over {@link PlanEnqueueModule}
 * (which owns the materialization transaction), so both the plans worker module (settle hooks, boot
 * reconcile) and the plans GraphQL module (the cancel hook) import it without a dependency cycle —
 * {@link PlanStatusService} cannot call it directly, because the enqueue pipeline depends on it.
 */
@Module({
  exports: [PlanRunScheduleService],
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    PlanEnqueueModule,
    WorkLedgerGraphqlModule,
  ],
  providers: [PlanRunScheduleService],
})
export class PlanRunScheduleModule {}
