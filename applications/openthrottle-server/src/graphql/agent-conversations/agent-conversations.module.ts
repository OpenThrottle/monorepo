/**
 * @description GraphQL module for persisted agent conversations (human JWT user-scoped).
 */

import { Module } from '@nestjs/common';
import {
  AgentConversationMessagesModule,
  AgentConversationsModule,
  RolesModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { ConversationStreamGraphqlModule } from '../conversation-stream/conversation-stream.module.ts';
import { AgentConversationsResolver } from './agent-conversations.resolver.ts';

@Module({
  imports: [
    AgentConversationMessagesModule,
    AgentConversationsModule,
    ConversationStreamGraphqlModule,
    RolesModule,
  ],
  providers: [AgentConversationsResolver, GqlPermissionsGuard],
})
export class AgentConversationsGraphqlModule {}
