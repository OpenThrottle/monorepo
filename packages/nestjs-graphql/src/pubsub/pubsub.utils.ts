import { PubSub, type PubSubEngine } from 'graphql-subscriptions';

/**
 * @description Builds the process-wide PubSub engine. In-memory `PubSub` from
 * graphql-subscriptions for now — publish happens inside this GraphQL server
 * process, so a single in-process instance reaches every subscriber.
 *
 * Redis seam: when the server scales horizontally, swap the body for a
 * `RedisPubSub` from graphql-redis-subscriptions (Redis is already present for
 * BullMQ — reuse REDIS_HOST/REDIS_PORT). Both implement {@link PubSubEngine}
 * (`asyncIterator(topics)` / `publish(topic, payload)`), so resolvers injecting
 * {@link PUB_SUB} need no change.
 *
 * @public
 */
export function createPubSub(): PubSubEngine {
  return new PubSub();
}
