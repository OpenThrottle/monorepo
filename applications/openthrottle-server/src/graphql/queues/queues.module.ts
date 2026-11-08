/**
 * @description GraphQL module for queues query. Provides QueuesResolver over
 * {@link QueuesServiceModule} (queue producers + QueuesService — processors are role-gated in the
 * app module) and re-exports it, so importers keep receiving QueuesService.
 */

import { Module } from '@nestjs/common';

import { QueuesResolver } from './queues.resolver.ts';
import { QueuesServiceModule } from './queues-service/queues-service.module.ts';

@Module({
  exports: [QueuesServiceModule],
  imports: [QueuesServiceModule],
  providers: [QueuesResolver],
})
export class QueuesGraphqlModule {}
