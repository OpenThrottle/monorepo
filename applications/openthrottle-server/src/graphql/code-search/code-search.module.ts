/**
 * @description GraphQL module for code semantic search. Registers CodeSearchResolver and imports
 * NestjsVectorSearchModule (CodeSearchService over the server's single EmbedderService),
 * NestjsRepositoriesModule (repository resolution), and CodeIndexQueueProducerModule (the code-index BullMQ queue, for @InjectQueue + enqueue).
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NestjsVectorSearchModule } from '@openthrottle/nestjs-vector-search';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { CodeIndexQueueProducerModule } from '../../queues/code-index/producer/producer.module.ts';
import { EmbedderModule } from '../../services/embedder/embedder.module.ts';
import { EmbedderService } from '../../services/embedder/embedder.service.ts';
import { CodeSearchResolver } from './code-search.resolver.ts';

@Module({
  imports: [
    CodeIndexQueueProducerModule,
    NestjsRepositoriesModule,
    NestjsVectorSearchModule.register({
      embedder: EmbedderService,
      imports: [EmbedderModule],
    }),
  ],
  providers: [GqlPermissionsGuard, CodeSearchResolver],
})
export class CodeSearchGraphqlModule {}
