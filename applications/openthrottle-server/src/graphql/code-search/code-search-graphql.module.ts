/**
 * @description GraphQL module for code semantic search. Registers CodeSearchResolver and imports
 * NestjsVectorSearchModule (CodeSearchService), NestjsRepositoriesModule (repository resolution),
 * and CodeIndexQueueModule (the code-index BullMQ queue, for @InjectQueue + enqueue).
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NestjsVectorSearchModule } from '@openthrottle/nestjs-vector-search';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { CodeIndexQueueModule } from '../../queues/code-index/code-index-queue.module';
import { CodeSearchResolver } from './code-search.resolver';

@Module({
  imports: [
    CodeIndexQueueModule,
    NestjsRepositoriesModule,
    NestjsVectorSearchModule,
  ],
  providers: [GqlPermissionsGuard, CodeSearchResolver],
})
export class CodeSearchGraphqlModule {}
