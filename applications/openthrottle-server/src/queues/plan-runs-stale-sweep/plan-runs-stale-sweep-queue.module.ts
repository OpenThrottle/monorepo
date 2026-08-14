import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { ForeignSkillInjectionModule } from '../../services/foreign-skill-injection/foreign-skill-injection.module';
import { PlanRunsStaleSweepQueueProducerModule } from './plan-runs-stale-sweep-queue-producer.module';
import { PlanRunsStaleSweepProcessor } from './plan-runs-stale-sweep.processor';
import { PlanRunsStaleSweepRepeatableService } from './plan-runs-stale-sweep-repeatable.service';

/**
 * @description Processor half of the plan-runs-stale-sweep queue (WorkerHost + repeatable
 * scheduler). Loaded only under PROCESS_ROLE worker/all. Settles stale (IN_PROGRESS, heartbeat past
 * cutoff) plan_runs to STALE and reconciles any plan a stale run stranded. The repeatable
 * registration lives with the processor so an api-only process doesn't create an orphan schedule.
 */
@Module({
  exports: [PlanRunsStaleSweepQueueProducerModule],
  imports: [
    ForeignSkillInjectionModule,
    LoggerModule,
    NestjsRepositoriesModule,
    PlanRunsStaleSweepQueueProducerModule,
  ],
  providers: [PlanRunsStaleSweepProcessor, PlanRunsStaleSweepRepeatableService],
})
export class PlanRunsStaleSweepQueueModule {}
