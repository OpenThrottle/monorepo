import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { PLAN_RULES_QUEUE_NAME } from './plan-rules.constants';
import { PlanRulesEvaluationService } from './plan-rules-evaluation.service';

/**
 * @description Producer half of the plan-rules queue: registerQueue, Bull
 * Board listing, and {@link PlanRulesEvaluationService} (fire-and-forget
 * after-commit enqueue from mutation paths). Safe under any PROCESS_ROLE; the
 * processor lives in PlanRulesQueueModule.
 */
@Module({
  exports: [BullModule, PlanRulesEvaluationService],
  imports: [
    LoggerModule,
    NestjsBullmqModule.registerQueue(PLAN_RULES_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(PLAN_RULES_QUEUE_NAME),
  ],
  providers: [PlanRulesEvaluationService],
})
export class PlanRulesQueueProducerModule {}
