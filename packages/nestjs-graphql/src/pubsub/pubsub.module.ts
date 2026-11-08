import { Global, Module } from '@nestjs/common';

import { PUB_SUB } from './pubsub.constants.ts';
import { createPubSub } from './pubsub.utils.ts';

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
