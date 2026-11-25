import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { AgentConversation } from '../agent-conversations/agent-conversation.entity.ts';
import { AgentConversationGroup } from './agent-conversation-group.entity.ts';
import { AGENT_CONVERSATION_GROUP_SORT_ORDER_STEP } from './agent-conversation-groups.constants.ts';
import type { AgentConversationGroupCreateInput } from './agent-conversation-groups.types.ts';

/**
 * @description Data access for the openthrottle `agent_conversation_groups` table on the default
 * connection: the `BaseRepository` CRUD plus the user-scoped group operations the chat sidebar
 * needs. Names arrive already normalized (see `normalizeAgentConversationGroupName`).
 * @public
 */
@Injectable()
export class AgentConversationGroupsRepository extends BaseRepository<
  AgentConversationGroup,
  AgentConversationGroupCreateInput
> {
  protected readonly tableName = 'agent_conversation_groups';

  constructor(
    @InjectRepository(AgentConversationGroup)
    repository: Repository<AgentConversationGroup>,
  ) {
    super(repository);
  }

  /**
   * @description Lists a user's groups in sidebar order (`sort_order` ascending).
   */
  async listGroupsForUser(userId: string): Promise<AgentConversationGroup[]> {
    return this.repository.find({
      order: { id: 'ASC', sortOrder: 'ASC' },
      where: { userId },
    });
  }

  /**
   * @description Creates a group at the end of the user's list: `max(sort_order) + 1000`, or
   * 1000 for a first group.
   */
  async createGroup(
    userId: string,
    name: string,
  ): Promise<AgentConversationGroup> {
    const last = await this.repository.findOne({
      order: { sortOrder: 'DESC' },
      where: { userId },
    });
    const sortOrder =
      (last?.sortOrder ?? 0) + AGENT_CONVERSATION_GROUP_SORT_ORDER_STEP;

    const entity = this.repository.create({ name, sortOrder, userId });

    return this.repository.save(entity);
  }

  /**
   * @description Renames an owned group.
   * @throws NotFoundException when it does not exist or is someone else's.
   */
  async renameGroup(
    userId: string,
    groupId: string,
    name: string,
  ): Promise<AgentConversationGroup> {
    const group = await this.getGroupForUser(userId, groupId);

    group.name = name;

    return this.repository.save(group);
  }

  /**
   * @description Deletes an owned group and clears `group_id` on its conversations in one
   * transaction (the conversations themselves are kept). Returns the deleted group.
   * @throws NotFoundException when it does not exist or is someone else's.
   */
  async deleteGroup(
    userId: string,
    groupId: string,
  ): Promise<AgentConversationGroup> {
    const group = await this.getGroupForUser(userId, groupId);

    await this.repository.manager.transaction(async (manager) => {
      await manager
        .getRepository(AgentConversation)
        .update({ groupId, userId }, { groupId: null });
      await manager
        .getRepository(AgentConversationGroup)
        .delete({ id: groupId, userId });
    });

    return group;
  }

  /**
   * @description Rewrites `sort_order` so the user's groups follow `orderedGroupIds`
   * (1000, 2000, ...), and returns them in the new order.
   * @throws BadRequestException when the ids are not exactly the user's groups, each once.
   */
  async reorderGroups(
    userId: string,
    orderedGroupIds: readonly string[],
  ): Promise<AgentConversationGroup[]> {
    const groups = await this.listGroupsForUser(userId);
    const knownIds = new Set(groups.map((group) => group.id));
    const requestedIds = new Set(orderedGroupIds);

    const isExactSet =
      requestedIds.size === orderedGroupIds.length &&
      requestedIds.size === knownIds.size &&
      orderedGroupIds.every((id) => knownIds.has(id));

    if (!isExactSet) {
      throw new BadRequestException(
        "Reorder must list every one of the user's groups exactly once",
      );
    }

    await this.repository.manager.transaction(async (manager) => {
      const groupRepository = manager.getRepository(AgentConversationGroup);

      await Promise.all(
        orderedGroupIds.map((id, index) => {
          return groupRepository.update(
            { id, userId },
            {
              sortOrder: (index + 1) * AGENT_CONVERSATION_GROUP_SORT_ORDER_STEP,
            },
          );
        }),
      );
    });

    return this.listGroupsForUser(userId);
  }

  private async getGroupForUser(
    userId: string,
    groupId: string,
  ): Promise<AgentConversationGroup> {
    const group = await this.repository.findOne({
      where: { id: groupId, userId },
    });

    if (!group) {
      throw new NotFoundException('Agent conversation group not found');
    }

    return group;
  }
}
