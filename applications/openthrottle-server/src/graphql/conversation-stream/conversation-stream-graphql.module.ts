/**
 * @description GraphQL module for conversation streaming. Registers the resolver
 * and the streaming service, and imports NestjsModelDiscoveryModule (endpoint/model
 * validation) and NestjsRepositoriesModule (AgentConversationsService). PUB_SUB is
 * provided by the global PubSubModule registered in app.module.
 */

import { Module } from '@nestjs/common';
import { NestjsModelDiscoveryModule } from '@openthrottle/nestjs-model-discovery';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { ConversationStreamResolver } from './conversation-stream.resolver';
import { ConversationStreamService } from './conversation-stream.service';

@Module({
  imports: [NestjsModelDiscoveryModule, NestjsRepositoriesModule],
  providers: [ConversationStreamResolver, ConversationStreamService],
})
export class ConversationStreamGraphqlModule {}
