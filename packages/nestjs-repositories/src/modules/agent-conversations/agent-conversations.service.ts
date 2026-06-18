/**
 * @description CRUD and turn persistence for agent_conversations (human user-scoped).
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import { AgentConversationMessage } from './agent-conversation-message.entity';
import {
  AGENT_CONVERSATION_MESSAGE_ROLES,
  AGENT_CONVERSATION_STATUSES,
  type AgentConversationMessageRole,
  type AgentConversationStatus,
} from './agent-conversation.constants';
import { AgentConversation } from './agent-conversation.entity';
import {
  capAgentConversationContent,
  capAgentConversationToolMetadata,
  clampAgentConversationListLimit,
  clampAgentConversationMessagesLimit,
} from './agent-conversation.util';
import { PlansService } from '../plans/plans.service';
import { ProjectsService } from '../projects/projects.service';

interface CreateConversationInput {
  readonly metadata?: Record<string, unknown> | null;
  readonly planId?: string | null;
  readonly projectId?: string | null;
  readonly title?: string | null;
}

interface ListConversationsOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly status?: AgentConversationStatus;
}

interface ListMessagesOptions {
  readonly limit?: number;
  readonly offset?: number;
}

interface AppendTurnInput {
  readonly assistantContent: string;
  readonly modelName?: string | null;
  readonly modelProvider?: string | null;
  readonly routingConfidence?: number | null;
  readonly routingModel?: string | null;
  readonly routingReason?: string | null;
  readonly routingTier?: string | null;
  readonly toolMetadata?: Record<string, unknown> | null;
  readonly userContent: string;
}

interface AppendMessageInput {
  readonly content: string;
  /** Optional explicit id (e.g. a pre-allocated assistant message id from a streaming turn). */
  readonly id?: string;
  readonly role: AgentConversationMessageRole;
  readonly routingConfidence?: number | null;
  readonly routingModel?: string | null;
  readonly routingReason?: string | null;
  readonly routingTier?: string | null;
  readonly toolMetadata?: Record<string, unknown> | null;
}

interface UpdateModelSnapshotInput {
  readonly modelName: string | null;
  readonly modelProvider: string | null;
}

export interface AppendTurnResult {
  readonly assistantMessage: AgentConversationMessage;
  readonly userMessage: AgentConversationMessage;
}

@Injectable()
export class AgentConversationsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(AgentConversation)
    private readonly conversationRepository: Repository<AgentConversation>,
    @InjectRepository(AgentConversationMessage)
    private readonly messageRepository: Repository<AgentConversationMessage>,
    private readonly plansService: PlansService,
    private readonly projectsService: ProjectsService,
  ) {
    this.logger.debug('🧩 agent-conversations 🧩');
  }

  /**
   * @description Returns the TypeORM repository for agent conversations.
   */
  getConversationRepository(): Repository<AgentConversation> {
    return this.conversationRepository;
  }

  /**
   * @description Returns the TypeORM repository for agent conversation messages.
   */
  getMessageRepository(): Repository<AgentConversationMessage> {
    return this.messageRepository;
  }

  /**
   * @description Creates a conversation owned by the user.
   */
  async createConversation(
    userId: string,
    input: CreateConversationInput = {},
  ): Promise<AgentConversation> {
    await this.assertPlanExistsWhenSet(input.planId);
    await this.assertProjectExistsWhenSet(input.projectId);

    const entity = this.conversationRepository.create({
      metadata: input.metadata ?? null,
      planId: input.planId ?? null,
      projectId: input.projectId ?? null,
      status: AGENT_CONVERSATION_STATUSES.active,
      title: input.title ?? null,
      userId,
    });

    return this.conversationRepository.save(entity);
  }

  /**
   * @description Appends a user+assistant turn in one transaction with monotonic sort_order.
   */
  async appendTurn(
    userId: string,
    conversationId: string,
    input: AppendTurnInput,
  ): Promise<AppendTurnResult> {
    const cappedUserContent = capAgentConversationContent(
      input.userContent,
    ).content;
    const cappedAssistantContent = capAgentConversationContent(
      input.assistantContent,
    ).content;
    const cappedToolMetadata = capAgentConversationToolMetadata(
      input.toolMetadata,
    );

    return this.conversationRepository.manager.transaction(async (manager) => {
      const conversationRepo = manager.getRepository(AgentConversation);
      const messageRepo = manager.getRepository(AgentConversationMessage);

      const conversation = await conversationRepo.findOne({
        where: { id: conversationId, userId },
      });
      if (!conversation) {
        throw new NotFoundException('Agent conversation not found');
      }

      const maxSortOrderResult = await messageRepo
        .createQueryBuilder('message')
        .select('MAX(message.sortOrder)', 'max')
        .where('message.conversationId = :conversationId', { conversationId })
        .getRawOne<{ max: string | null }>();

      const currentMax =
        maxSortOrderResult?.max != null && maxSortOrderResult.max !== ''
          ? Number(maxSortOrderResult.max)
          : 0;
      const userSortOrder = currentMax + 1;
      const assistantSortOrder = currentMax + 2;

      const userMessage = await messageRepo.save(
        messageRepo.create({
          content: cappedUserContent,
          conversationId,
          role: AGENT_CONVERSATION_MESSAGE_ROLES.user,
          routingConfidence: null,
          routingModel: null,
          routingReason: null,
          routingTier: null,
          sortOrder: userSortOrder,
          toolMetadata: null,
        }),
      );

      const assistantMessage = await messageRepo.save(
        messageRepo.create({
          content: cappedAssistantContent,
          conversationId,
          role: AGENT_CONVERSATION_MESSAGE_ROLES.assistant,
          routingConfidence: input.routingConfidence ?? null,
          routingModel: input.routingModel ?? null,
          routingReason: input.routingReason ?? null,
          routingTier: input.routingTier ?? null,
          sortOrder: assistantSortOrder,
          toolMetadata: cappedToolMetadata.toolMetadata,
        }),
      );

      if (input.modelProvider !== undefined || input.modelName !== undefined) {
        conversation.modelProvider = input.modelProvider ?? null;
        conversation.modelName = input.modelName ?? null;
        await conversationRepo.save(conversation);
      }

      return { assistantMessage, userMessage };
    });
  }

  /**
   * @description Appends one or more messages to an owned conversation in a
   * single transaction with consecutive sort_order values continuing from the
   * conversation's current maximum. Each message may carry an explicit id (used
   * by streaming turns that pre-allocate the assistant message id). Returns the
   * saved rows in input order.
   */
  async appendMessages(
    userId: string,
    conversationId: string,
    messages: ReadonlyArray<AppendMessageInput>,
  ): Promise<AgentConversationMessage[]> {
    return this.conversationRepository.manager.transaction(async (manager) => {
      const conversationRepo = manager.getRepository(AgentConversation);
      const messageRepo = manager.getRepository(AgentConversationMessage);

      const conversation = await conversationRepo.findOne({
        where: { id: conversationId, userId },
      });
      if (!conversation) {
        throw new NotFoundException('Agent conversation not found');
      }

      const maxSortOrderResult = await messageRepo
        .createQueryBuilder('message')
        .select('MAX(message.sortOrder)', 'max')
        .where('message.conversationId = :conversationId', { conversationId })
        .getRawOne<{ max: string | null }>();
      const currentMax =
        maxSortOrderResult?.max != null && maxSortOrderResult.max !== ''
          ? Number(maxSortOrderResult.max)
          : 0;

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
   * @description Lists conversations for a user (newest activity first).
   */
  async listConversationsForUser(
    userId: string,
    options: ListConversationsOptions = {},
  ): Promise<AgentConversation[]> {
    const limit = clampAgentConversationListLimit(options.limit);
    const offset = Math.max(options.offset ?? 0, 0);
    const status = options.status ?? AGENT_CONVERSATION_STATUSES.active;

    return this.conversationRepository.find({
      order: { updatedAt: 'DESC' },
      skip: offset,
      take: limit,
      where: { status, userId },
    });
  }

  /**
   * @description Returns a conversation when owned by the user; otherwise throws 404.
   */
  async getConversationForUser(
    userId: string,
    conversationId: string,
  ): Promise<AgentConversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('Agent conversation not found');
    }

    return conversation;
  }

  /**
   * @description Lists messages for an owned conversation ordered by sort_order ASC.
   */
  async listMessagesForConversation(
    userId: string,
    conversationId: string,
    options: ListMessagesOptions = {},
  ): Promise<AgentConversationMessage[]> {
    await this.getConversationForUser(userId, conversationId);

    const limit = clampAgentConversationMessagesLimit(options.limit);
    const offset = Math.max(options.offset ?? 0, 0);

    return this.messageRepository.find({
      order: { sortOrder: 'ASC' },
      skip: offset,
      take: limit,
      where: { conversationId },
    });
  }

  /**
   * @description Archives an owned conversation (no hard delete in v1).
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
    return this.conversationRepository.save(conversation);
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
    return this.conversationRepository.save(conversation);
  }

  /**
   * @description Updates router LLM snapshot columns on a conversation row.
   */
  async updateModelSnapshot(
    conversationId: string,
    input: UpdateModelSnapshotInput,
  ): Promise<AgentConversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException('Agent conversation not found');
    }

    conversation.modelProvider = input.modelProvider;
    conversation.modelName = input.modelName;
    return this.conversationRepository.save(conversation);
  }

  private async assertPlanExistsWhenSet(
    planId: string | null | undefined,
  ): Promise<void> {
    if (planId == null) {
      return;
    }

    const plan = await this.plansService
      .getRepository()
      .findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`Plan not found: ${planId}`);
    }
  }

  private async assertProjectExistsWhenSet(
    projectId: string | null | undefined,
  ): Promise<void> {
    if (projectId == null) {
      return;
    }

    const project = await this.projectsService.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }
  }
}
