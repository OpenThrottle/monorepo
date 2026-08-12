/**
 * @description GraphQL module for server-side agent-CLI install/update. Registers the resolver + the
 * streaming service and the permissions guard. Imports AgentDiscoveryGraphqlModule so it shares the
 * SAME AgentDiscoveryService singleton — a successful run invalidates that instance's cache so the
 * discoverAgentClis query reflects the new binary. PUB_SUB is provided by the global PubSubModule.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { AgentDiscoveryGraphqlModule } from '../agent-discovery/agent-discovery-graphql.module';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { AgentSetupResolver } from './agent-setup.resolver';
import { AgentSetupService } from './agent-setup.service';

@Module({
  imports: [
    AgentDiscoveryGraphqlModule,
    LoggerModule,
    NestjsRepositoriesModule,
  ],
  providers: [AgentSetupResolver, AgentSetupService, GqlPermissionsGuard],
})
export class AgentSetupGraphqlModule {}
