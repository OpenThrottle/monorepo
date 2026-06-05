import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { PLAN_LIFECYCLE_HOOKS_QUEUE_NAME } from './plan-lifecycle-hooks.constants';
import { PlanLifecycleHooksProcessor } from './plan-lifecycle-hooks.processor';
import { WorkflowLifecycleDispatcherFactory } from './workflow-lifecycle-dispatcher.service';

/**
 * @description Registers the `plan-lifecycle-hooks` BullMQ queue and worker for Jest-style lifecycle
 * hook child jobs (beforeAll / beforeEach / afterEach / afterAll).
 */
@Module({
  exports: [BullModule, WorkflowLifecycleDispatcherFactory],
  imports: [
    LoggerModule,
    NestjsBullmqModule.registerQueue(PLAN_LIFECYCLE_HOOKS_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(PLAN_LIFECYCLE_HOOKS_QUEUE_NAME),
    NestjsRepositoriesModule,
  ],
  providers: [PlanLifecycleHooksProcessor, WorkflowLifecycleDispatcherFactory],
})
export class PlanLifecycleHooksQueueModule {}
