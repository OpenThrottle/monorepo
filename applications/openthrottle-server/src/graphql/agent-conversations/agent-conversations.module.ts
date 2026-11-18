/**
 * @description GraphQL module for persisted agent conversations (human JWT user-scoped).
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { RolesModule } from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { AgentConversationsResolver } from './agent-conversations.resolver.ts';

@Module({
  imports: [RolesModule, NestjsRepositoriesModule],
  providers: [AgentConversationsResolver, GqlPermissionsGuard],
})
export class AgentConversationsGraphqlModule {}
