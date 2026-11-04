import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { PlanStatusModule } from '../../graphql/plans/plan-status.module.ts';
import { WorkLedgerGraphqlModule } from '../../graphql/work-ledger/work-ledger-graphql.module.ts';
import { ForeignSkillInjectionModule } from '../../services/foreign-skill-injection/foreign-skill-injection.module.ts';
import { PlanRunsStaleSweepProcessor } from './plan-runs-stale-sweep.processor.ts';
import { PlanRunsStaleSweepQueueProducerModule } from './plan-runs-stale-sweep-queue-producer.module.ts';
import { PlanRunsStaleSweepRepeatableService } from './plan-runs-stale-sweep-repeatable.service.ts';

/**
 * @description Processor half of the plan-runs-stale-sweep queue (WorkerHost + repeatable
 * scheduler). Loaded only under PROCESS_ROLE worker/all. Settles stale (IN_PROGRESS, heartbeat past
 * cutoff) plan_runs to STALE and reconciles any plan a stale run stranded. The repeatable
 * registration lives with the processor so an api-only process doesn't create an orphan schedule.
 * PlanStatusModule (the plans.status write chokepoint) and WorkLedgerGraphqlModule (for the
 * `status-change-system` service-account lookup the reconcile attributes its write to) are
 * imported for the reconcile's plan status write.
 */
@Module({
  exports: [PlanRunsStaleSweepQueueProducerModule],
  imports: [
    ForeignSkillInjectionModule,
    LoggerModule,
    NestjsRepositoriesModule,
    PlanRunsStaleSweepQueueProducerModule,
    PlanStatusModule,
    WorkLedgerGraphqlModule,
  ],
  providers: [PlanRunsStaleSweepProcessor, PlanRunsStaleSweepRepeatableService],
})
export class PlanRunsStaleSweepQueueModule {}
