/**
 * @description GraphQL subscription resolver for real-time notifications over
 * graphql-ws. Routing is server-side by topic (no client-side planId filtering):
 * - notifications: the global firehose (every event) — replaces the Socket.IO bridge.
 * - planNotifications(planId): lifecycle events for one plan — replaces the plan
 *   detail view's client-side socket filtering.
 *
 * Published payloads are envelopes ({ event }); `resolve` unwraps to the
 * NotificationEvent the interface resolveType then discriminates.
 */
import { ForbiddenException, Inject } from '@nestjs/common';
import { Args, Context, ID, Resolver, Subscription } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';
import {
  PUB_SUB,
  notificationsFirehoseTopic,
  planLifecycleTopic,
  type PubSubEngine,
} from '@openthrottle/nestjs-graphql';
import { NotificationEvent } from './notification-event.object';

interface NotificationEnvelope {
  readonly event: NotificationEvent;
}

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Public()
@Resolver()
export class NotificationsSubscriptionResolver {
  constructor(@Inject(PUB_SUB) private readonly pubSub: PubSubEngine) {}

  @Subscription(() => NotificationEvent, {
    description: `Firehose of all real-time notification events. Identity comes from the authenticated ws connection.`,
    resolve: (payload: NotificationEnvelope) => payload.event,
  })
  notifications(
    @Context() context: { userId?: string },
  ): AsyncIterator<NotificationEnvelope> {
    this.requireAuthenticatedConnection(context);

    return this.pubSub.asyncIterator(notificationsFirehoseTopic());
  }

  @Subscription(() => NotificationEvent, {
    description: `Lifecycle notifications for a single plan (topic plan:<planId>:lifecycle).`,
    resolve: (payload: NotificationEnvelope) => payload.event,
  })
  planNotifications(
    @Args('planId', { type: () => ID }) planId: string,
    @Context() context: { userId?: string },
  ): AsyncIterator<NotificationEnvelope> {
    this.requireAuthenticatedConnection(context);

    return this.pubSub.asyncIterator(planLifecycleTopic(planId));
  }

  private requireAuthenticatedConnection(context: { userId?: string }): void {
    if (!context.userId) {
      throw new ForbiddenException(
        'A subscription requires an authenticated connection',
      );
    }
  }
}
