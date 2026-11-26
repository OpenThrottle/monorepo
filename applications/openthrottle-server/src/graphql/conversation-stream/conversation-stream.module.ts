/**
 * @description GraphQL module for conversation streaming. Registers the resolver
 * and the streaming service, and imports NestjsModelDiscoveryModule (endpoint/model
 * validation) and the conversation, message and token-usage repositories. PUB_SUB is
 * provided by the global PubSubModule registered in app.module.
 */

import { Module } from '@nestjs/common';
import { NestjsModelDiscoveryModule } from '@openthrottle/nestjs-model-discovery';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  AgentConversationMessagesModule,
  AgentConversationsModule,
  AgentTokenUsageModule,
  CustomPromptsModule,
  UserDisabledAgentClisModule,
} from '@openthrottle/nestjs-repositories-server';

import { AgentAccountStampingModule } from '../../services/agent-account-stamping/agent-account-stamping.module.ts';
import { CheckoutPathModule } from '../../services/checkout-path/checkout-path.module.ts';
import { ConversationStreamResolver } from './conversation-stream.resolver.ts';
import { ConversationStreamService } from './conversation-stream.service.ts';

@Module({
  exports: [ConversationStreamService],
  imports: [
    AgentConversationMessagesModule,
    AgentConversationsModule,
    AgentTokenUsageModule,
    CustomPromptsModule,
    UserDisabledAgentClisModule,
    AgentAccountStampingModule,
    CheckoutPathModule,
    LoggerModule,
    NestjsModelDiscoveryModule,
  ],
  providers: [ConversationStreamResolver, ConversationStreamService],
})
export class ConversationStreamGraphqlModule {}
