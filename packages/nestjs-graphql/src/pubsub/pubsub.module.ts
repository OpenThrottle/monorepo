import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { LoggerModule, LoggerService } from '@openthrottle/nestjs-modules';
import { createRedisClient } from '@openthrottle/nestjs-redis';
import type { PubSubEngine } from 'graphql-subscriptions';

import { PUB_SUB } from './pubsub.constants.ts';
import { createPubSub, resolvePubSubChannelPrefix } from './pubsub.utils.ts';
import { RedisPubSubEngine } from './redis-pubsub-engine.strategy.ts';

/**
 * @description Global module exposing the shared {@link PubSubEngine} under the
 * {@link PUB_SUB} token. Global so any GraphQL feature module can inject the same
 * singleton without re-importing. With `REDIS_HOST` set the engine is
 * Redis-backed and crosses processes; without it, in-memory (see
 * {@link createPubSub}). The Redis connections are its own, closed on shutdown.
 *
 * @public
 */
@Global()
@Module({
  exports: [PUB_SUB],
  imports: [LoggerModule],
  providers: [
    {
      inject: [LoggerService],
      provide: PUB_SUB,
      useFactory: (logger: LoggerService): PubSubEngine => {
        return createPubSub({
          channelPrefix: resolvePubSubChannelPrefix(),
          logger,
          redis: createRedisClient(logger),
        });
      },
    },
  ],
})
export class PubSubModule implements OnApplicationShutdown {
  constructor(@Inject(PUB_SUB) private readonly pubSub: PubSubEngine) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.pubSub instanceof RedisPubSubEngine) {
      await this.pubSub.close();
    }
  }
}
