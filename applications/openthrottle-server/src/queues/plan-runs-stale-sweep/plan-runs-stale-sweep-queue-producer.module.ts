import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { PLAN_RUNS_STALE_SWEEP_QUEUE_NAME } from './plan-runs-stale-sweep.constants';

/**
 * @description Producer half of the plan-runs-stale-sweep queue: registerQueue + Bull Board,
 * no WorkerHost. Safe under any PROCESS_ROLE; the processor + repeatable scheduler live in
 * {@link PlanRunsStaleSweepQueueModule}.
 */
@Module({
  exports: [BullModule],
  imports: [
    NestjsBullmqModule.registerQueue(PLAN_RUNS_STALE_SWEEP_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(PLAN_RUNS_STALE_SWEEP_QUEUE_NAME),
  ],
})
export class PlanRunsStaleSweepQueueProducerModule {}
