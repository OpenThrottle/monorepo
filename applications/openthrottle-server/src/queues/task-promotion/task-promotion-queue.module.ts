import { Module } from '@nestjs/common';
import { GlobalClsModule, LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { WorkLedgerCaptureService } from '../../graphql/work-ledger/work-ledger-capture.service.ts';
import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { TaskPromotionProcessor } from './task-promotion.processor.ts';
import { TaskPromotionService } from './task-promotion.service.ts';
import { TaskPromotionQueueProducerModule } from './task-promotion-queue-producer.module.ts';

/**
 * @description Processor half of the task-promotion queue: the WorkerHost that
 * promotes a task into a full plan, plus the {@link TaskPromotionService} that
 * owns the promotion transaction. Loaded only under PROCESS_ROLE worker/all
 * (gated in app.module's buildImports like the other queues). The service is
 * exported so the plan-rules `promote_task_to_plan` executor can share it.
 *
 * Provides {@link WorkLedgerCaptureService} directly (not via WorkLedgerGraphqlModule,
 * which is API-tier only and gated behind isApiLike) so TaskPromotionService can write the
 * source task's own `status_change` ledger fact alongside its `plan_promotion` artifact.
 * WorkLedgerCaptureService itself only depends on GlobalClsService — no GraphQL/resolver
 * baggage — matching how {@link WorkLedgerRunService} is provided locally in PlansQueueModule
 * rather than reaching into the API-tier module.
 */
@Module({
  exports: [TaskPromotionQueueProducerModule, TaskPromotionService],
  imports: [
    GlobalClsModule,
    LoggerModule,
    NestjsRepositoriesModule,
    NotificationsModule,
    TaskPromotionQueueProducerModule,
  ],
  providers: [
    TaskPromotionProcessor,
    TaskPromotionService,
    WorkLedgerCaptureService,
  ],
})
export class TaskPromotionQueueModule {}
