import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PlansModule,
  ProjectsModule,
} from '@openthrottle/nestjs-repositories-server';

import { AgentConversation } from './agent-conversation.entity.ts';
import { AgentConversationMessage } from './agent-conversation-message.entity.ts';
import { AgentConversationsService } from './agent-conversations.service.ts';

@Module({
  controllers: [],
  exports: [AgentConversationsService],
  imports: [
    LoggerModule,
    PlansModule,
    ProjectsModule,
    TypeOrmModule.forFeature([AgentConversation, AgentConversationMessage]),
  ],
  providers: [AgentConversationsService],
})
export class AgentConversationsModule {}
