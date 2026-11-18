/**
 * @description GraphQL module for agent-CLI discovery. Registers
 * AgentDiscoveryResolver + the cached AgentDiscoveryService.
 */
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import {
  RolesModule,
  UserDisabledAgentClisModule,
  UserFavoriteAgentModelsModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { AgentDiscoveryResolver } from './agent-discovery.resolver.ts';
import { AgentDiscoveryService } from './agent-discovery.service.ts';

@Module({
  exports: [AgentDiscoveryService],
  imports: [
    RolesModule,
    UserDisabledAgentClisModule,
    UserFavoriteAgentModelsModule,
    LoggerModule,
    NestjsRepositoriesModule,
  ],
  providers: [
    AgentDiscoveryResolver,
    AgentDiscoveryService,
    GqlPermissionsGuard,
  ],
})
export class AgentDiscoveryGraphqlModule {}
