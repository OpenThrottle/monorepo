import { Module } from '@nestjs/common';
import { GlobalClsModule, LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { WorkLedgerCaptureService } from '../../graphql/work-ledger/work-ledger-capture.service.ts';
import { PlanContextAvailabilityModule } from '../../services/plan-context-availability/plan-context-availability.module.ts';
import { WorkLedgerRunService } from '../plans/work-ledger-run.service.ts';
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
 *
 * Provides {@link WorkLedgerCaptureService} and {@link WorkLedgerRunService} directly (not via the
 * API-tier WorkLedgerGraphqlModule) so {@link PlanRulesProcessor} can capture the task-level
 * `status_change` fact when the orphan-soft-close path moves an injected task to SKIPPED. Same
 * precedent as TaskPromotionQueueModule and PlansQueueModule: WorkLedgerCaptureService only depends
 * on GlobalClsService, and WorkLedgerRunService only on repositories already imported here — no
 * GraphQL/resolver baggage, so neither needs the API-tier module.
 */
@Module({
  exports: [ActionExecutorRegistry, PlanRulesQueueProducerModule],
  imports: [
    GlobalClsModule,
    LoggerModule,
    NestjsRepositoriesModule,
    PlanContextAvailabilityModule,
    PlanRulesQueueProducerModule,
    TaskPromotionQueueModule,
  ],
  providers: [
    ActionExecutorRegistry,
    InjectTaskExecutor,
    PlanRulesProcessor,
    PromoteTaskToPlanExecutor,
    WorkLedgerCaptureService,
    WorkLedgerRunService,
  ],
})
export class PlanRulesQueueModule {}
