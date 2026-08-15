import {
  Inject,
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
import { REDIS_CLIENT } from '@openthrottle/nestjs-redis';
import type { Redis } from 'ioredis';
import { PlanRunCancellationService } from './plan-run-cancellation.service';

/**
 * @description Channel 2 (the low-latency fast path) of the plan-run cancellation design
 * (OT plan 2ab62876). A dedicated control-plane pub/sub channel, decoupled from the GraphQL
 * `PUB_SUB` engine (signed-off knob #1): every server process subscribes to `plan:*:cancel` on a
 * duplicate of the dedicated control-plane Redis connection ({@link REDIS_CLIENT}) and, on a
 * matching message, fires its local
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
  private subscriber: Redis | null = null;

  constructor(
    private readonly logger: LoggerService,
    private readonly planRunCancellation: PlanRunCancellationService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis | null,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.redis === null) {
      this.logger.info(
        'Plan-cancel subscriber not started (Redis unconfigured); cancellation falls back to the durable marker',
        PlanCancelChannelService.name,
      );

      return;
    }

    try {
      const subscriber = this.redis.duplicate();

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
   * stop. Uses the dedicated command connection (not the subscribe-mode connection). A no-op when
   * Redis is unconfigured — the durable marker remains the guaranteed fallback.
   */
  async publishCancel(planId: string): Promise<void> {
    if (this.redis === null) {
      return;
    }

    try {
      await this.redis.publish(planCancelTopic(planId), '1');
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
