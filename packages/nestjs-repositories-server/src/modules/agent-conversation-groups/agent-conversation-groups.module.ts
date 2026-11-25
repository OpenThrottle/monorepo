import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentConversationGroup } from './agent-conversation-group.entity.ts';
import { AgentConversationGroupsRepository } from './agent-conversation-groups.repository.ts';

/**
 * @description Registers {@link AgentConversationGroup} on the default connection and provides
 * {@link AgentConversationGroupsRepository}.
 * @public
 */
@Module({
  exports: [AgentConversationGroupsRepository],
  imports: [TypeOrmModule.forFeature([AgentConversationGroup])],
  providers: [AgentConversationGroupsRepository],
})
export class AgentConversationGroupsModule {}
