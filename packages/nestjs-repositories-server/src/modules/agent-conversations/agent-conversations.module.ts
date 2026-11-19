import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentConversation } from './agent-conversation.entity.ts';
import { AgentConversationsRepository } from './agent-conversations.repository.ts';

/**
 * @description Registers {@link AgentConversation} on the default connection and provides
 * {@link AgentConversationsRepository}.
 * @public
 */
@Module({
  exports: [AgentConversationsRepository],
  imports: [TypeOrmModule.forFeature([AgentConversation])],
  providers: [AgentConversationsRepository],
})
export class AgentConversationsModule {}
