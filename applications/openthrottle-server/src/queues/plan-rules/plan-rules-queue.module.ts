import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { WorkLedgerGraphqlModule } from '../../graphql/work-ledger/work-ledger-graphql.module.ts';
import { PlanContextAvailabilityModule } from '../../services/plan-context-availability/plan-context-availability.module.ts';
import { TaskPromotionQueueModule } from '../task-promotion/task-promotion-queue.module.ts';
import { ActionExecutorRegistry } from './action-executor.ts';
import { InjectTaskExecutor } from './inject-task.executor.ts';
import { PlanRulesProcessor } from './plan-rules.processor.ts';
import { PlanRulesQueueProducerModule } from './plan-rules-queue-producer.module.ts';
import { PromoteTaskToPlanExecutor } from './promote-task-to-plan.executor.ts';

/**
 * @description Processor half of the plan-rules queue: the WorkerHost that
 * evaluates tag→action rules per plan and dispatches to the
 * {@link ActionExecutorRegistry}. Loaded only under PROCESS_ROLE worker/all.
 * Concrete executors (inject-task, availability-exception, promote-task-to-plan)
 * are provided by their own slices and register on the exported registry. The
 * promote executor reuses TaskPromotionService from {@link TaskPromotionQueueModule}.
 * WorkLedgerGraphqlModule (for the `status-change-system` service-account lookup and
 * WorkLedgerCaptureService) is imported for InjectTaskExecutor's revive-on-reinject task write.
 */
@Module({
  exports: [ActionExecutorRegistry, PlanRulesQueueProducerModule],
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    PlanContextAvailabilityModule,
    PlanRulesQueueProducerModule,
    TaskPromotionQueueModule,
    WorkLedgerGraphqlModule,
  ],
  providers: [
    ActionExecutorRegistry,
    InjectTaskExecutor,
    PlanRulesProcessor,
    PromoteTaskToPlanExecutor,
  ],
})
export class PlanRulesQueueModule {}
