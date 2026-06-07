/**
 * @description GraphQL module for persisted agent conversations (human JWT user-scoped).
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { AgentConversationsResolver } from './agent-conversations.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [AgentConversationsResolver, GqlPermissionsGuard],
})
export class AgentConversationsGraphqlModule {}
