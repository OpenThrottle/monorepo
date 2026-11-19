import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentConversationMessage } from './agent-conversation-message.entity.ts';
import { AgentConversationMessagesRepository } from './agent-conversation-messages.repository.ts';

/**
 * @description Registers {@link AgentConversationMessage} on the default connection and provides
 * {@link AgentConversationMessagesRepository}.
 * @public
 */
@Module({
  exports: [AgentConversationMessagesRepository],
  imports: [TypeOrmModule.forFeature([AgentConversationMessage])],
  providers: [AgentConversationMessagesRepository],
})
export class AgentConversationMessagesModule {}
