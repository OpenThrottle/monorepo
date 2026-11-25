/**
 * @description GraphQL module for code semantic search. Registers CodeSearchResolver and imports
 * NestjsVectorSearchModule (CodeSearchService over the server's single EmbedderService),
 * RolesModule (for GqlPermissionsGuard), CodeIndexQueueProducerModule (the code-index BullMQ queue, for @InjectQueue + enqueue),
 * and the effective-user + checkout-path resolvers (so an MCP service account can search from its workspace).
 */

import { Module } from '@nestjs/common';
import {
  RepositoryCheckoutsModule,
  RolesModule,
} from '@openthrottle/nestjs-repositories-server';
import { NestjsVectorSearchModule } from '@openthrottle/nestjs-vector-search';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { CodeIndexQueueProducerModule } from '../../queues/code-index/producer/producer.module.ts';
import { CheckoutPathResolutionModule } from '../../services/checkout-path-resolution/checkout-path-resolution.module.ts';
import { EffectiveUserResolutionModule } from '../../services/effective-user-resolution/effective-user-resolution.module.ts';
import { EmbedderModule } from '../../services/embedder/embedder.module.ts';
import { EmbedderService } from '../../services/embedder/embedder.service.ts';
import { WorkspaceLocalRepositoriesModule } from '../../services/workspace-local-repositories/workspace-local-repositories.module.ts';
import { CodeSearchResolver } from './code-search.resolver.ts';

@Module({
  imports: [
    RolesModule,
    CheckoutPathResolutionModule,
    CodeIndexQueueProducerModule,
    EffectiveUserResolutionModule,
    RepositoryCheckoutsModule,
    WorkspaceLocalRepositoriesModule,
    NestjsVectorSearchModule.register({
      embedder: EmbedderService,
      imports: [EmbedderModule],
    }),
  ],
  providers: [GqlPermissionsGuard, CodeSearchResolver],
})
export class CodeSearchGraphqlModule {}
