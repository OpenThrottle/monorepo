import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { ActionExecutorRegistry } from './action-executor';
import { PlanRulesQueueProducerModule } from './plan-rules-queue-producer.module';
import { PlanRulesProcessor } from './plan-rules.processor';

/**
 * @description Processor half of the plan-rules queue: the WorkerHost that
 * evaluates tag→action rules per plan and dispatches to the
 * {@link ActionExecutorRegistry}. Loaded only under PROCESS_ROLE worker/all.
 * Concrete executors (inject-task, availability-exception) are provided by
 * their own slices and register on the exported registry.
 */
@Module({
  exports: [ActionExecutorRegistry, PlanRulesQueueProducerModule],
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    PlanRulesQueueProducerModule,
  ],
  providers: [ActionExecutorRegistry, PlanRulesProcessor],
})
export class PlanRulesQueueModule {}
