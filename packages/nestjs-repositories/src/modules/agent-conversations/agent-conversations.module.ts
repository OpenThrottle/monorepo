import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { AgentConversationMessage } from './agent-conversation-message.entity';
import { AgentConversation } from './agent-conversation.entity';
import { AgentConversationsService } from './agent-conversations.service';
import { PlansModule } from '../plans/plans.module';
import { ProjectsModule } from '../projects/projects.module';

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
