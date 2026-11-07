import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { PlanRunWorktreeReaperModule } from '../../services/plan-run-worktree-reaper/plan-run-worktree-reaper.module.ts';
import { PlanRunWorktreeReaperProcessor } from './plan-run-worktree-reaper.processor.ts';
import { PlanRunWorktreeReaperQueueProducerModule } from './plan-run-worktree-reaper-queue-producer.module.ts';
import { PlanRunWorktreeReaperRepeatableService } from './plan-run-worktree-reaper-repeatable.service.ts';

/**
 * @description Processor half of the plan-run worktree reaper queue (WorkerHost + repeatable
 * scheduler). Loaded only under PROCESS_ROLE worker/all, so an api-only process never registers an
 * orphan schedule.
 */
@Module({
  exports: [PlanRunWorktreeReaperQueueProducerModule],
  imports: [
    LoggerModule,
    PlanRunWorktreeReaperModule,
    PlanRunWorktreeReaperQueueProducerModule,
  ],
  providers: [
    PlanRunWorktreeReaperProcessor,
    PlanRunWorktreeReaperRepeatableService,
  ],
})
export class PlanRunWorktreeReaperQueueModule {}
