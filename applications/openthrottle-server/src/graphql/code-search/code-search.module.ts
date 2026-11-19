/**
 * @description GraphQL module for code semantic search. Registers CodeSearchResolver and imports
 * NestjsVectorSearchModule (CodeSearchService over the server's single EmbedderService),
 * RolesModule (for GqlPermissionsGuard), and CodeIndexQueueProducerModule (the code-index BullMQ queue, for @InjectQueue + enqueue).
 */

import { Module } from '@nestjs/common';
import { RolesModule } from '@openthrottle/nestjs-repositories-server';
import { NestjsVectorSearchModule } from '@openthrottle/nestjs-vector-search';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { CodeIndexQueueProducerModule } from '../../queues/code-index/producer/producer.module.ts';
import { EmbedderModule } from '../../services/embedder/embedder.module.ts';
import { EmbedderService } from '../../services/embedder/embedder.service.ts';
import { WorkspaceLocalRepositoriesModule } from '../../services/workspace-local-repositories/workspace-local-repositories.module.ts';
import { CodeSearchResolver } from './code-search.resolver.ts';

@Module({
  imports: [
    RolesModule,
    CodeIndexQueueProducerModule,
    WorkspaceLocalRepositoriesModule,
    NestjsVectorSearchModule.register({
      embedder: EmbedderService,
      imports: [EmbedderModule],
    }),
  ],
  providers: [GqlPermissionsGuard, CodeSearchResolver],
})
export class CodeSearchGraphqlModule {}
