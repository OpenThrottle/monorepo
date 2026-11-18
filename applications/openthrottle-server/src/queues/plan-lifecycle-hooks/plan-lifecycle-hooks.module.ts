import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PlanOutputStreamModule,
  PlansModule,
  TasksModule,
} from '@openthrottle/nestjs-repositories-server';

import { PlanLifecycleHooksProcessor } from './plan-lifecycle-hooks.processor.ts';
import { PlanLifecycleHooksQueueProducerModule } from './producer/producer.module.ts';

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
    PlanLifecycleHooksQueueProducerModule,
    PlanOutputStreamModule,
    PlansModule,
    TasksModule,
  ],
  providers: [PlanLifecycleHooksProcessor],
})
export class PlanLifecycleHooksQueueModule {}
