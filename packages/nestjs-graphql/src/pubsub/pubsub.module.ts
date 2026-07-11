import { Global, Module } from '@nestjs/common';
import { PubSub, type PubSubEngine } from 'graphql-subscriptions';
import { PUB_SUB } from './pubsub.constants';

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

/**
 * @description Global module exposing the shared {@link PubSubEngine} under the
 * {@link PUB_SUB} token. Global so any GraphQL feature module can inject the same
 * singleton without re-importing — publishers and subscribers must share one
 * instance for the in-memory backend to deliver events.
 *
 * @public
 */
@Global()
@Module({
  exports: [PUB_SUB],
  providers: [
    {
      provide: PUB_SUB,
      useFactory: createPubSub,
    },
  ],
})
export class PubSubModule {}
