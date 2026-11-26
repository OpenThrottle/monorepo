import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import type { EntityManager } from 'typeorm';
import { Repository } from 'typeorm';

import { AgentConversation } from '../agent-conversations/agent-conversation.entity.ts';
import {
  capAgentConversationContent,
  capAgentConversationToolMetadata,
  clampAgentConversationMessagesLimit,
} from '../agent-conversations/content-caps/content-caps.utils.ts';
import { AgentConversationMessage } from './agent-conversation-message.entity.ts';
import { AGENT_CONVERSATION_MESSAGE_ROLES } from './agent-conversation-messages.constants.ts';
import type {
  AppendAgentConversationMessageParams,
  AppendAgentConversationTurnParams,
  AppendTurnResult,
  ListAgentConversationMessagesOptions,
} from './agent-conversation-messages.types.ts';

/**
 * @description Reads a `MAX(sort_order)` raw result as a number; a missing row, `null` or an
 * empty string is 0.
 */
const resolveCurrentMaxSortOrder = (
  result: { max: string | null } | undefined,
): number => {
  if (result?.max == null || result.max === '') {
    return 0;
  }

  return Number(result.max);
};

interface LockedConversation {
  readonly conversation: AgentConversation;
  readonly currentMax: number;
}

/**
 * @description Data access for the openthrottle `agent_conversation_messages` table on the default
 * connection: the `BaseRepository` CRUD plus the transactional appends that keep `sort_order`
 * monotonic, and the owner-checked reads. A delete is a hard delete; nothing deletes a message
 * on its own today. Every write and read requires the conversation to be live and, where a user
 * is given, owned by that user.
 * @public
 */
@Injectable()
export class AgentConversationMessagesRepository extends BaseRepository<
  AgentConversationMessage,
  CreateModelInput<AgentConversationMessage>
> {
  protected readonly tableName = 'agent_conversation_messages';

  constructor(
    @InjectRepository(AgentConversationMessage)
    repository: Repository<AgentConversationMessage>,
  ) {
    super(repository);
  }

  /**
   * @description Appends a user + assistant turn in one transaction with consecutive `sort_order`
   * values, and updates the conversation's model snapshot when one is given.
   * @throws NotFoundException when the conversation is not live or not the user's.
   */
  async appendTurn(
    userId: string,
    conversationId: string,
    params: AppendAgentConversationTurnParams,
  ): Promise<AppendTurnResult> {
    const userContent = capAgentConversationContent(params.userContent).content;
    const assistantContent = capAgentConversationContent(
      params.assistantContent,
    ).content;
    const { toolMetadata } = capAgentConversationToolMetadata(
      params.toolMetadata,
    );

    return this.repository.manager.transaction(async (manager) => {
      const messageRepo = manager.getRepository(AgentConversationMessage);
      const { conversation, currentMax } = await this.lockConversation(
        manager,
        userId,
        conversationId,
      );

      const userMessage = await messageRepo.save(
        messageRepo.create({
          content: userContent,
          conversationId,
          role: AGENT_CONVERSATION_MESSAGE_ROLES.user,
          routingConfidence: null,
          routingModel: null,
          routingReason: null,
          routingTier: null,
          sortOrder: currentMax + 1,
          toolMetadata: null,
        }),
      );

      const assistantMessage = await messageRepo.save(
        messageRepo.create({
          content: assistantContent,
          conversationId,
          role: AGENT_CONVERSATION_MESSAGE_ROLES.assistant,
          routingConfidence: params.routingConfidence ?? null,
          routingModel: params.routingModel ?? null,
          routingReason: params.routingReason ?? null,
          routingTier: params.routingTier ?? null,
          sortOrder: currentMax + 2,
          toolMetadata,
        }),
      );

      const hasModelSnapshot =
        params.modelProvider !== undefined || params.modelName !== undefined;

      if (hasModelSnapshot) {
        conversation.modelProvider = params.modelProvider ?? null;
        conversation.modelName = params.modelName ?? null;

        await manager.getRepository(AgentConversation).save(conversation);
      }

      return { assistantMessage, userMessage };
    });
  }

  /**
   * @description Appends one or more messages to an owned conversation in one transaction, with
   * consecutive `sort_order` values continuing from its current maximum. A message may carry an
   * explicit id (streaming turns pre-allocate the assistant message id). Returns the saved rows in
   * input order.
   * @throws NotFoundException when the conversation is not live or not the user's.
   */
  async appendMessages(
    userId: string,
    conversationId: string,
    messages: ReadonlyArray<AppendAgentConversationMessageParams>,
  ): Promise<AgentConversationMessage[]> {
    return this.repository.manager.transaction(async (manager) => {
      const messageRepo = manager.getRepository(AgentConversationMessage);
      const { currentMax } = await this.lockConversation(
        manager,
        userId,
        conversationId,
      );

      const entities = messages.map((message, index) => {
        const base = {
          content: capAgentConversationContent(message.content).content,
          conversationId,
          role: message.role,
          routingConfidence: message.routingConfidence ?? null,
          routingModel: message.routingModel ?? null,
          routingReason: message.routingReason ?? null,
          routingTier: message.routingTier ?? null,
          sortOrder: currentMax + index + 1,
          toolMetadata: capAgentConversationToolMetadata(
            message.toolMetadata ?? null,
          ).toolMetadata,
        };

        return messageRepo.create(
          message.id !== undefined ? { ...base, id: message.id } : base,
        );
      });

      return messageRepo.save(entities);
    });
  }

  /**
   * @description Lists an owned conversation's messages by `sort_order` ascending.
   * @throws NotFoundException when the conversation is not live or not the user's.
   */
  async listMessagesForConversation(
    userId: string,
    conversationId: string,
    options: ListAgentConversationMessagesOptions = {},
  ): Promise<AgentConversationMessage[]> {
    await this.assertConversationOwned(userId, conversationId);

    const limit = clampAgentConversationMessagesLimit(options.limit);
    const offset = Math.max(options.offset ?? 0, 0);

    if (options.fromNewest === true) {
      const newestFirst = await this.repository.find({
        order: { sortOrder: 'DESC' },
        skip: offset,
        take: limit,
        where: { conversationId },
      });

      return newestFirst.reverse();
    }

    return this.repository.find({
      order: { sortOrder: 'ASC' },
      skip: offset,
      take: limit,
      where: { conversationId },
    });
  }

  /**
   * @description Counts a conversation's messages, for list totals.
   */
  async countMessagesForConversation(conversationId: string): Promise<number> {
    return this.repository.count({ where: { conversationId } });
  }

  /**
   * @description Row-locks the live, owned conversation, then reads its `MAX(sort_order)`. The
   * lock makes concurrent appends to one conversation serialize: under READ COMMITTED the MAX read
   * alone locks no gap, so two writers could compute the same maximum and collide on the
   * `(conversation_id, sort_order)` unique index (a 23505 rollback).
   */
  private async lockConversation(
    manager: EntityManager,
    userId: string,
    conversationId: string,
  ): Promise<LockedConversation> {
    const conversation = await manager
      .getRepository(AgentConversation)
      .findOne({
        lock: { mode: 'pessimistic_write' },
        where: { id: conversationId, userId },
      });

    if (!conversation) {
      throw new NotFoundException('Agent conversation not found');
    }

    const maxSortOrderResult = await manager
      .getRepository(AgentConversationMessage)
      .createQueryBuilder('message')
      .select('MAX(message.sortOrder)', 'max')
      .where('message.conversationId = :conversationId', { conversationId })
      .getRawOne<{ max: string | null }>();

    return {
      conversation,
      currentMax: resolveCurrentMaxSortOrder(maxSortOrderResult),
    };
  }

  private async assertConversationOwned(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const exists = await this.repository.manager
      .getRepository(AgentConversation)
      .exists({ where: { id: conversationId, userId } });

    if (!exists) {
      throw new NotFoundException('Agent conversation not found');
    }
  }
}
