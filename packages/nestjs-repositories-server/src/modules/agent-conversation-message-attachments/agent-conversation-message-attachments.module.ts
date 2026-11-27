import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentConversationMessageAttachment } from './agent-conversation-message-attachment.entity.ts';
import { AgentConversationMessageAttachmentsRepository } from './agent-conversation-message-attachments.repository.ts';

/**
 * @description Registers {@link AgentConversationMessageAttachment} on the default connection and
 * provides {@link AgentConversationMessageAttachmentsRepository}.
 * @public
 */
@Module({
  exports: [AgentConversationMessageAttachmentsRepository],
  imports: [TypeOrmModule.forFeature([AgentConversationMessageAttachment])],
  providers: [AgentConversationMessageAttachmentsRepository],
})
export class AgentConversationMessageAttachmentsModule {}
