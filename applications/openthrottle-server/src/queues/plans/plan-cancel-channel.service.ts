import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  parsePlanIdFromCancelTopic,
  planCancelTopic,
  PLAN_CANCEL_TOPIC_PATTERN,
} from '@openthrottle/nestjs-graphql';
import type { Queue } from 'bullmq';
import {
  duplicateQueueRedisClient,
  getQueueRedisClient,
  type QueueRedisClient,
} from '../bullmq-redis-client';
import { PLANS_QUEUE_NAME } from './plans.constants';
import { PlanRunCancellationService } from './plan-run-cancellation.service';
import type { RunPlanJobData } from './plans.types';

/**
 * @description Channel 2 (the low-latency fast path) of the plan-run cancellation design
 * (OT plan 2ab62876). A dedicated control-plane pub/sub channel, decoupled from the GraphQL
 * `PUB_SUB` engine (signed-off knob #1): every server process subscribes to `plan:*:cancel` on a
 * duplicated BullMQ Redis connection and, on a matching message, fires its local
 * {@link PlanRunCancellationService} AbortController — so a `cancelPlanRun` handled on one process
 * stops an active run owned by any other process/host. `abort()` is a no-op where no controller is
 * registered, so subscribing everywhere is safe and makes PROCESS_ROLE=all and the api/worker split
 * behave identically. Best-effort: the durable `plan_runs.cancel_requested_at` marker (Channel 1)
 * is the guaranteed fallback when a message is missed or a subscriber connected late.
 */
@Injectable()
export class PlanCancelChannelService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private subscriber: QueueRedisClient | null = null;

  constructor(
    private readonly logger: LoggerService,
    private readonly planRunCancellation: PlanRunCancellationService,
    @InjectQueue(PLANS_QUEUE_NAME)
    private readonly plansQueue: Queue<RunPlanJobData, void>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const base = await getQueueRedisClient(this.plansQueue);
      const subscriber = duplicateQueueRedisClient(base);

      subscriber.on('error', (error: Error) => {
        this.logger.warn(
          `Plan-cancel subscriber connection error: ${error.message}`,
          PlanCancelChannelService.name,
        );
      });

      subscriber.on(
        'pmessage',
        (_pattern: string, channel: string, _message: string) => {
          const planId = parsePlanIdFromCancelTopic(channel);
          if (planId === null) {
            return;
          }

          const aborted = this.planRunCancellation.abort(planId);
          this.logger.info(
            `Plan-cancel signal received for planId=${planId} (local run ${aborted ? 'aborted' : 'not owned here'})`,
            PlanCancelChannelService.name,
          );
        },
      );

      await subscriber.psubscribe(PLAN_CANCEL_TOPIC_PATTERN);
      this.subscriber = subscriber;

      this.logger.info(
        `Plan-cancel subscriber listening on ${PLAN_CANCEL_TOPIC_PATTERN}`,
        PlanCancelChannelService.name,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to start plan-cancel subscriber (cancellation falls back to the durable marker): ${error instanceof Error ? error.message : String(error)}`,
        PlanCancelChannelService.name,
      );
    }
  }

  /**
   * @description Publishes a cross-process cancel signal for a plan. Best-effort: a publish failure
   * is logged and swallowed because the durable marker stamped by `cancelRun` still guarantees the
   * stop. Reuses the BullMQ command connection (not the subscribe-mode connection).
   */
  async publishCancel(planId: string): Promise<void> {
    try {
      const client = await getQueueRedisClient(this.plansQueue);
      await client.publish(planCancelTopic(planId), '1');
    } catch (error) {
      this.logger.warn(
        `Failed to publish plan-cancel signal for planId=${planId} (durable marker still applies): ${error instanceof Error ? error.message : String(error)}`,
        PlanCancelChannelService.name,
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    const subscriber = this.subscriber;
    this.subscriber = null;

    if (subscriber === null) {
      return;
    }

    try {
      await subscriber.quit();
    } catch (error) {
      this.logger.warn(
        `Failed to close plan-cancel subscriber connection: ${error instanceof Error ? error.message : String(error)}`,
        PlanCancelChannelService.name,
      );
    }
  }
}
