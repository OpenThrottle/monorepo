import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { PlanLifecycleHooksQueueProducerModule } from './plan-lifecycle-hooks-queue-producer.module';
import { PlanLifecycleHooksProcessor } from './plan-lifecycle-hooks.processor';

/**
 * @description Processor half of the plan-lifecycle-hooks queue: the WorkerHost
 * for Jest-style lifecycle hook child jobs (beforeAll / beforeEach / afterEach /
 * afterAll). Loaded only under PROCESS_ROLE worker/all. The dispatcher
 * (producer side) lives in {@link PlanLifecycleHooksQueueProducerModule} and is
 * re-exported here for the plans processor.
 */
@Module({
  exports: [PlanLifecycleHooksQueueProducerModule],
  imports: [
    LoggerModule,
    NestjsRepositoriesModule,
    PlanLifecycleHooksQueueProducerModule,
  ],
  providers: [PlanLifecycleHooksProcessor],
})
export class PlanLifecycleHooksQueueModule {}
