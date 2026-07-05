/**
 * @description GraphQL module for code semantic search. Registers CodeSearchResolver and imports
 * NestjsVectorSearchModule (CodeSearchService), NestjsRepositoriesModule (repository resolution),
 * and CodeIndexQueueProducerModule (the code-index BullMQ queue, for @InjectQueue + enqueue).
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NestjsVectorSearchModule } from '@openthrottle/nestjs-vector-search';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { CodeIndexQueueProducerModule } from '../../queues/code-index/code-index-queue-producer.module';
import { CodeSearchResolver } from './code-search.resolver';

@Module({
  imports: [
    CodeIndexQueueProducerModule,
    NestjsRepositoriesModule,
    NestjsVectorSearchModule,
  ],
  providers: [GqlPermissionsGuard, CodeSearchResolver],
})
export class CodeSearchGraphqlModule {}
