/**
 * @description GraphQL module for user-defined agent conversation groups (human JWT user-scoped).
 */

import { Module } from '@nestjs/common';
import {
  AgentConversationGroupsModule,
  RolesModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { AgentConversationGroupsResolver } from './agent-conversation-groups.resolver.ts';

@Module({
  imports: [AgentConversationGroupsModule, RolesModule],
  providers: [AgentConversationGroupsResolver, GqlPermissionsGuard],
})
export class AgentConversationGroupsGraphqlModule {}
