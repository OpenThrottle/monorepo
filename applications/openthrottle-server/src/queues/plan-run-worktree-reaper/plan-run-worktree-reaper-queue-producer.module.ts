import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';

import { PLAN_RUN_WORKTREE_REAPER_QUEUE_NAME } from './plan-run-worktree-reaper.constants.ts';

/**
 * @description Producer half of the plan-run worktree reaper queue: registerQueue + Bull Board,
 * no WorkerHost. The processor + repeatable scheduler live in {@link PlanRunWorktreeReaperQueueModule}.
 */
@Module({
  exports: [BullModule],
  imports: [
    NestjsBullmqModule.registerQueue(PLAN_RUN_WORKTREE_REAPER_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(PLAN_RUN_WORKTREE_REAPER_QUEUE_NAME),
  ],
})
export class PlanRunWorktreeReaperQueueProducerModule {}
