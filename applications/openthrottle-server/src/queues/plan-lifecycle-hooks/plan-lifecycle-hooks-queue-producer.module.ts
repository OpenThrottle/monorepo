import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { PLAN_LIFECYCLE_HOOKS_QUEUE_NAME } from './plan-lifecycle-hooks.constants';
import { WorkflowLifecycleDispatcherFactory } from './workflow-lifecycle-dispatcher.service';

/**
 * @description Producer half of the plan-lifecycle-hooks queue: registerQueue,
 * Bull Board listing, and {@link WorkflowLifecycleDispatcherFactory} (enqueues
 * hook child jobs and awaits their completion via QueueEvents), no WorkerHost.
 * Safe under any PROCESS_ROLE; the processor lives in
 * {@link PlanLifecycleHooksQueueModule}.
 */
@Module({
  exports: [BullModule, WorkflowLifecycleDispatcherFactory],
  imports: [
    LoggerModule,
    NestjsBullmqModule.registerQueue(PLAN_LIFECYCLE_HOOKS_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(PLAN_LIFECYCLE_HOOKS_QUEUE_NAME),
  ],
  providers: [WorkflowLifecycleDispatcherFactory],
})
export class PlanLifecycleHooksQueueProducerModule {}
