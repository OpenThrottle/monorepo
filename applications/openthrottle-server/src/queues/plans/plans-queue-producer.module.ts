import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { PLANS_QUEUE_NAME } from './plans.constants';
import { PlanCancelChannelService } from './plan-cancel-channel.service';
import { PlanRunCancellationService } from './plan-run-cancellation.service';

/**
 * @description Producer half of the plans queue: registerQueue (enqueuePlanRun
 * & friends), Bull Board listing, {@link PlanRunCancellationService}, and the
 * {@link PlanCancelChannelService} control-plane pub/sub channel, no WorkerHost.
 * Safe under any PROCESS_ROLE; the processor lives in {@link PlansQueueModule}.
 *
 * PlanRunCancellationService is provided HERE (and imported by the processor
 * module) so PROCESS_ROLE=all resolves ONE shared instance for both the
 * GraphQL cancel mutation and the worker.
 *
 * Cross-process cancellation (OT plan 2ab62876): every process importing this
 * module runs a PlanCancelChannelService that subscribes to `plan:*:cancel`, so
 * a cancelPlanRun handled on the API process now stops a run active inside a
 * separate worker process (Channel 2 fast path), with the durable
 * plan_runs.cancel_requested_at marker as the guaranteed fallback (Channel 1) —
 * replacing the earlier "signaledActiveRunToStop=false across a process split"
 * degradation.
 */
@Module({
  exports: [BullModule, PlanCancelChannelService, PlanRunCancellationService],
  imports: [
    LoggerModule,
    NestjsBullmqModule.registerQueue(PLANS_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(PLANS_QUEUE_NAME),
  ],
  providers: [PlanCancelChannelService, PlanRunCancellationService],
})
export class PlansQueueProducerModule {}
