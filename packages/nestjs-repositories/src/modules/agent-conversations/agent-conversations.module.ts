import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { PlansModule } from '../plans/plans.module';
import { ProjectsModule } from '../projects/projects.module';
import { AgentConversation } from './agent-conversation.entity';
import { AgentConversationMessage } from './agent-conversation-message.entity';
import { AgentConversationsService } from './agent-conversations.service';

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
