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
    // Object-level authz: plans are globally readable in this workspace (the
    // `plans` table has no per-user ownership column — only nullable
    // author/assignee usernames — and PlansResolver's plan(id)/plans()/
    // listPlansByStatus queries return any plan to any authenticated principal).
    // There is therefore no (userId, planId) access relation to verify here, so
    // an authenticated connection is the correct and sufficient gate — matching
    // the sibling planOutputChunkAdded(planId) subscription, which streams the
    // far more sensitive plan output log under the same stance. If plans ever
    // gain per-user scoping (ownership column + migration), this resolver must
    // be updated to verify access before returning the async iterator.
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
