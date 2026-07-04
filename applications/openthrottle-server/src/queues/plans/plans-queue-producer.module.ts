import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { PLANS_QUEUE_NAME } from './plans.constants';
import { PlanRunCancellationService } from './plan-run-cancellation.service';

/**
 * @description Producer half of the plans queue: registerQueue (enqueuePlanRun
 * & friends), Bull Board listing, and {@link PlanRunCancellationService}, no
 * WorkerHost. Safe under any PROCESS_ROLE; the processor lives in
 * {@link PlansQueueModule}.
 *
 * PlanRunCancellationService is provided HERE (and imported by the processor
 * module) so PROCESS_ROLE=all resolves ONE shared instance for both the
 * GraphQL cancel mutation and the worker. Under a real api/worker split the
 * registry is per-process, so cancelPlanRun from the API can still remove
 * waiting jobs but reports signaledActiveRunToStop=false for a run that is
 * active inside the separate worker process — an accepted, honest degradation
 * for now.
 */
@Module({
  exports: [BullModule, PlanRunCancellationService],
  imports: [
    NestjsBullmqModule.registerQueue(PLANS_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(PLANS_QUEUE_NAME),
  ],
  providers: [PlanRunCancellationService],
})
export class PlansQueueProducerModule {}
