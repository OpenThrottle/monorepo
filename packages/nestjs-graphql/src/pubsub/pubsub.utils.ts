import { PubSub, type PubSubEngine } from 'graphql-subscriptions';

import type { CreatePubSubOptions } from './pubsub.types.ts';
import { RedisPubSubEngine } from './redis-pubsub-engine.strategy.ts';

/** Namespace for GraphQL topics on the shared Redis, apart from `plan:*:cancel` and BullMQ keys. */
const CHANNEL_NAMESPACE = 'gql';

/**
 * @description Builds the process-wide PubSub engine.
 *
 * - **Redis configured** (`redis` non-null): a {@link RedisPubSubEngine}, so an
 *   event published in one process (a `PROCESS_ROLE=worker`, another API
 *   replica) reaches websocket subscribers held by every other process.
 * - **No Redis** (unconfigured boots, tests): the in-memory `PubSub` from
 *   graphql-subscriptions, which only reaches subscribers in this process —
 *   enough for `PROCESS_ROLE=all`.
 *
 * Both implement {@link PubSubEngine}, so resolvers injecting `PUB_SUB` are
 * unaffected by the choice.
 *
 * @public
 */
export function createPubSub(options: CreatePubSubOptions): PubSubEngine {
  if (options.redis === null) {
    return new PubSub();
  }

  return new RedisPubSubEngine({
    channelPrefix: options.channelPrefix,
    logger: options.logger,
    publisher: options.redis,
    subscriber: options.redis.duplicate(),
  });
}

/**
 * @description The Redis channel prefix for GraphQL topics in this checkout.
 * Worktrees share the host Redis, so — like BullMQ's queue prefix — each
 * checkout gets its own namespace from `OT_CONTAINER_PREFIX`, or the env
 * override `OT_PUBSUB_PREFIX`; otherwise `gql:`. Every process of one checkout
 * reads the same env, so publisher and subscriber agree.
 *
 * @public
 */
export function resolvePubSubChannelPrefix(): string {
  const explicit = process.env.OT_PUBSUB_PREFIX?.trim();
  if (explicit) {
    return explicit;
  }

  const containerPrefix = process.env.OT_CONTAINER_PREFIX?.trim().replace(
    /-+$/,
    '',
  );
  if (containerPrefix) {
    return `${CHANNEL_NAMESPACE}:${containerPrefix}:`;
  }

  return `${CHANNEL_NAMESPACE}:`;
}
