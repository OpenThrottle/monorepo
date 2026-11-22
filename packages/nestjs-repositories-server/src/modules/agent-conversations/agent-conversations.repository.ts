import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { Plan } from '../plans/plan.entity.ts';
import { Project } from '../projects/project.entity.ts';
import { AgentConversation } from './agent-conversation.entity.ts';
import { AGENT_CONVERSATION_STATUSES } from './agent-conversations.constants.ts';
import type {
  AgentConversationStatus,
  CreateAgentConversationParams,
  ListAgentConversationsOptions,
  UpdateAgentConversationModelSnapshotParams,
} from './agent-conversations.types.ts';
import { clampAgentConversationListLimit } from './content-caps/content-caps.utils.ts';

/**
 * @description Data access for the openthrottle `agent_conversations` table on the default
 * connection: the `BaseRepository` CRUD plus the user-scoped reads and writes the chat surfaces
 * need. A delete is soft and also sets `status` to `'deleted'`, so every read here (inherited or
 * custom) skips a deleted conversation.
 * @public
 */
@Injectable()
export class AgentConversationsRepository extends BaseRepository<
  AgentConversation,
  CreateModelInput<AgentConversation>
> {
  protected readonly tableName = 'agent_conversations';

  constructor(
    @InjectRepository(AgentConversation)
    repository: Repository<AgentConversation>,
  ) {
    super(repository);
  }

  /**
   * @description Creates an active conversation owned by the user.
   * @throws NotFoundException when a given `planId` or `projectId` names no live row.
   */
  async createConversation(
    userId: string,
    params: CreateAgentConversationParams = {},
  ): Promise<AgentConversation> {
    await this.assertPlanExistsWhenSet(params.planId);
    await this.assertProjectExistsWhenSet(params.projectId);

    const entity = this.repository.create({
      metadata: params.metadata ?? null,
      planId: params.planId ?? null,
      projectId: params.projectId ?? null,
      status: AGENT_CONVERSATION_STATUSES.active,
      title: params.title ?? null,
      userId,
    });

    return this.repository.save(entity);
  }

  /**
   * @description Returns a live conversation when the user owns it.
   * @throws NotFoundException when it does not exist, is deleted or is someone else's.
   */
  async getConversationForUser(
    userId: string,
    conversationId: string,
  ): Promise<AgentConversation> {
    const conversation = await this.repository.findOne({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Agent conversation not found');
    }

    return conversation;
  }

  /**
   * @description Lists a user's conversations in one status (default `active`), most recently
   * active first.
   */
  async listConversationsForUser(
    userId: string,
    options: ListAgentConversationsOptions = {},
  ): Promise<AgentConversation[]> {
    const limit = clampAgentConversationListLimit(options.limit);
    const offset = Math.max(options.offset ?? 0, 0);
    const status = options.status ?? AGENT_CONVERSATION_STATUSES.active;

    return this.repository.find({
      order: { updatedAt: 'DESC' },
      skip: offset,
      take: limit,
      where: { status, userId },
    });
  }

  /**
   * @description Counts a user's live conversations in one status, for list totals.
   */
  async countConversationsForUser(
    userId: string,
    status: AgentConversationStatus,
  ): Promise<number> {
    return this.repository.count({ where: { status, userId } });
  }

  /**
   * @description Archives an owned conversation. Archived conversations stay readable.
   */
  async archiveConversation(
    userId: string,
    conversationId: string,
  ): Promise<AgentConversation> {
    const conversation = await this.getConversationForUser(
      userId,
      conversationId,
    );

    conversation.status = AGENT_CONVERSATION_STATUSES.archived;

    return this.repository.save(conversation);
  }

  /**
   * @description Soft deletes an owned conversation: sets `status` to `'deleted'` and stamps
   * `deleted_at` in one statement, then returns the deleted row. Its messages stay until data
   * retention purges the conversation 30 days later. `updated_at` is left unchanged: deleting is
   * not activity, so the row keeps its place in the list (trigger from migration 193).
   * @throws NotFoundException when it does not exist, is already deleted or is someone else's.
   */
  async softDeleteConversation(
    userId: string,
    conversationId: string,
  ): Promise<AgentConversation> {
    await this.getConversationForUser(userId, conversationId);

    await this.repository.update(
      { id: conversationId, userId },
      { deletedAt: new Date(), status: AGENT_CONVERSATION_STATUSES.deleted },
    );

    const deleted = await this.repository.findOne({
      where: { id: conversationId },
      withDeleted: true,
    });

    if (!deleted) {
      throw new NotFoundException('Agent conversation not found');
    }

    return deleted;
  }

  /**
   * @description Restores a soft-deleted owned conversation: sets `status` back to `'active'` and
   * clears `deleted_at` in one statement, then returns the row. A conversation in any other status
   * (active or archived, e.g. a stale second restore) is returned unchanged with no write.
   * `updated_at` is left unchanged, so an Undo puts the conversation back in its original list
   * position (trigger from migration 193).
   * @throws NotFoundException when it does not exist or is someone else's.
   */
  async restoreConversation(
    userId: string,
    conversationId: string,
  ): Promise<AgentConversation> {
    const conversation = await this.repository.findOne({
      where: { id: conversationId, userId },
      withDeleted: true,
    });

    if (!conversation) {
      throw new NotFoundException('Agent conversation not found');
    }

    if (conversation.status !== AGENT_CONVERSATION_STATUSES.deleted) {
      return conversation;
    }

    await this.repository.update(
      { id: conversationId, userId },
      { deletedAt: null, status: AGENT_CONVERSATION_STATUSES.active },
    );

    const restored = await this.repository.findOne({
      where: { id: conversationId, userId },
    });

    if (!restored) {
      throw new NotFoundException('Agent conversation not found');
    }

    return restored;
  }

  /**
   * @description Updates the title on an owned conversation.
   */
  async updateConversationTitle(
    userId: string,
    conversationId: string,
    title: string,
  ): Promise<AgentConversation> {
    const conversation = await this.getConversationForUser(
      userId,
      conversationId,
    );

    conversation.title = title;

    return this.repository.save(conversation);
  }

  /**
   * @description Updates the router LLM snapshot columns on a live conversation.
   */
  async updateModelSnapshot(
    conversationId: string,
    params: UpdateAgentConversationModelSnapshotParams,
  ): Promise<AgentConversation> {
    const conversation = await this.findLiveConversation(conversationId);

    conversation.modelProvider = params.modelProvider;
    conversation.modelName = params.modelName;

    return this.repository.save(conversation);
  }

  /**
   * @description Shallow-merges a patch into a live conversation's `metadata` (e.g. a CLI
   * backend's session id and repository id). Existing keys are overwritten; others are kept.
   */
  async updateMetadata(
    conversationId: string,
    patch: Record<string, unknown>,
  ): Promise<AgentConversation> {
    const conversation = await this.findLiveConversation(conversationId);

    conversation.metadata = { ...(conversation.metadata ?? {}), ...patch };

    return this.repository.save(conversation);
  }

  private async findLiveConversation(
    conversationId: string,
  ): Promise<AgentConversation> {
    const conversation = await this.repository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Agent conversation not found');
    }

    return conversation;
  }

  private async assertPlanExistsWhenSet(
    planId: string | null | undefined,
  ): Promise<void> {
    if (planId == null) {
      return;
    }

    const exists = await this.repository.manager
      .getRepository(Plan)
      .exists({ where: { id: planId } });

    if (!exists) {
      throw new NotFoundException(`Plan not found: ${planId}`);
    }
  }

  private async assertProjectExistsWhenSet(
    projectId: string | null | undefined,
  ): Promise<void> {
    if (projectId == null) {
      return;
    }

    const exists = await this.repository.manager
      .getRepository(Project)
      .exists({ where: { id: projectId } });

    if (!exists) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }
  }
}
