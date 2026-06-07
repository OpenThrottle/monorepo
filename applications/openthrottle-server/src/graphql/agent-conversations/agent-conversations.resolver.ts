/**
 * @description GraphQL resolver for persisted agent conversations (human JWT user-scoped).
 */

import {
  AGENT_CONVERSATION_STATUSES,
  AgentConversationsService,
  type AgentConversationStatus,
} from '@openthrottle/nestjs-repositories';
import { type AuthPrincipal, CurrentUser } from '@openthrottle/nestjs-auth';
import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { assertHumanAuthPrincipal } from '../service-accounts/assert-human-auth-principal';
import {
  ArchiveAgentConversationInput,
  CreateAgentConversationInput,
  GetAgentConversationMessagesInput,
  ListAgentConversationsInput,
  UpdateAgentConversationTitleInput,
} from './agent-conversation.input';
import {
  parseAgentConversationMetadataJson,
  toAgentConversationMessageObject,
  toAgentConversationObject,
} from './agent-conversation.mapper';
import {
  AgentConversationObject,
  ListAgentConversationMessagesResultObject,
  ListAgentConversationsResultObject,
} from './agent-conversation.object';

const resolveConversationStatus = (
  status: string | null | undefined,
): AgentConversationStatus => {
  const normalized = status?.trim().toLowerCase();

  if (normalized === AGENT_CONVERSATION_STATUSES.archived) {
    return AGENT_CONVERSATION_STATUSES.archived;
  }

  return AGENT_CONVERSATION_STATUSES.active;
};

@Resolver(() => AgentConversationObject)
@UseGuards(GqlPermissionsGuard)
export class AgentConversationsResolver {
  constructor(
    private readonly agentConversationsService: AgentConversationsService,
  ) {}

  @Query(() => ListAgentConversationsResultObject, {
    description: `List agent conversations for the authenticated human user (default status=active, limit 20 max 100).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async listAgentConversations(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', {
      nullable: true,
      type: () => ListAgentConversationsInput,
    })
    input: ListAgentConversationsInput | null,
  ): Promise<ListAgentConversationsResultObject> {
    const user = assertHumanAuthPrincipal(principal);
    const status = resolveConversationStatus(input?.status);
    const limit = input?.limit ?? undefined;
    const offset = input?.offset ?? undefined;

    const [conversations, totalCount] = await Promise.all([
      this.agentConversationsService.listConversationsForUser(user.sub, {
        limit,
        offset,
        status,
      }),
      this.agentConversationsService
        .getConversationRepository()
        .count({ where: { status, userId: user.sub } }),
    ]);

    const result = new ListAgentConversationsResultObject();

    result.conversations = conversations.map(toAgentConversationObject);
    result.totalCount = totalCount;

    return result;
  }

  @Query(() => AgentConversationObject, {
    description: `Get one agent conversation by ID for the authenticated human user.`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async getAgentConversation(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<AgentConversationObject | null> {
    const user = assertHumanAuthPrincipal(principal);

    try {
      const conversation =
        await this.agentConversationsService.getConversationForUser(
          user.sub,
          id,
        );

      return toAgentConversationObject(conversation);
    } catch {
      return null;
    }
  }

  @Query(() => ListAgentConversationMessagesResultObject, {
    description: `List messages for an owned conversation ordered by sort_order ASC (default limit 100 max 500).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async getAgentConversationMessages(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => GetAgentConversationMessagesInput })
    input: GetAgentConversationMessagesInput,
  ): Promise<ListAgentConversationMessagesResultObject> {
    const user = assertHumanAuthPrincipal(principal);

    const [messages, totalCount] = await Promise.all([
      this.agentConversationsService.listMessagesForConversation(
        user.sub,
        input.conversationId,
        {
          limit: input.limit ?? undefined,
          offset: input.offset ?? undefined,
        },
      ),
      this.agentConversationsService
        .getMessageRepository()
        .count({ where: { conversationId: input.conversationId } }),
    ]);

    const result = new ListAgentConversationMessagesResultObject();

    result.messages = messages.map(toAgentConversationMessageObject);
    result.totalCount = totalCount;

    return result;
  }

  @Mutation(() => AgentConversationObject, {
    description: `Create an agent conversation for the authenticated human user.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async createAgentConversation(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', {
      nullable: true,
      type: () => CreateAgentConversationInput,
    })
    input: CreateAgentConversationInput | null,
  ): Promise<AgentConversationObject> {
    const user = assertHumanAuthPrincipal(principal);

    const conversation =
      await this.agentConversationsService.createConversation(user.sub, {
        metadata: parseAgentConversationMetadataJson(input?.metadataJson),
        planId: input?.planId ?? null,
        projectId: input?.projectId ?? null,
        title: input?.title ?? null,
      });

    return toAgentConversationObject(conversation);
  }

  @Mutation(() => AgentConversationObject, {
    description: `Archive an owned agent conversation (no hard delete in v1).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async archiveAgentConversation(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => ArchiveAgentConversationInput })
    input: ArchiveAgentConversationInput,
  ): Promise<AgentConversationObject> {
    const user = assertHumanAuthPrincipal(principal);

    const conversation =
      await this.agentConversationsService.archiveConversation(
        user.sub,
        input.conversationId,
      );

    return toAgentConversationObject(conversation);
  }

  @Mutation(() => AgentConversationObject, {
    description: `Update the title on an owned agent conversation.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async updateAgentConversationTitle(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => UpdateAgentConversationTitleInput })
    input: UpdateAgentConversationTitleInput,
  ): Promise<AgentConversationObject> {
    const user = assertHumanAuthPrincipal(principal);

    const conversation =
      await this.agentConversationsService.updateConversationTitle(
        user.sub,
        input.conversationId,
        input.title,
      );

    return toAgentConversationObject(conversation);
  }
}
