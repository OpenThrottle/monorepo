/**
 * @description GraphQL resolver for persisted agent conversations (human JWT user-scoped).
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { assertPagination } from '@openthrottle/nestjs-graphql';
import { hasNextPage } from '@openthrottle/nestjs-postgres';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import type { AgentConversationStatus } from '@openthrottle/nestjs-repositories-server';
import {
  AGENT_CONVERSATION_LIST_MAX_LIMIT,
  AGENT_CONVERSATION_MESSAGES_MAX_LIMIT,
  AGENT_CONVERSATION_STATUSES,
  AgentConversationMessagesRepository,
  AgentConversationsRepository,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { ConversationStreamService } from '../conversation-stream/conversation-stream.service.ts';
import { assertHumanAuthPrincipal } from '../service-accounts/service-accounts.utils.ts';
import {
  ArchiveAgentConversationInput,
  CreateAgentConversationInput,
  DeleteAgentConversationInput,
  GetAgentConversationMessagesInput,
  ListAgentConversationsInput,
  MoveAgentConversationToGroupInput,
  RestoreAgentConversationInput,
  SetAgentConversationPinnedInput,
  UpdateAgentConversationTitleInput,
} from './agent-conversation.input.ts';
import {
  parseAgentConversationMetadataJson,
  toAgentConversationMessageObject,
  toAgentConversationObject,
} from './agent-conversation.mapper.ts';
import {
  AgentConversationActiveTurnObject,
  AgentConversationObject,
  ListAgentConversationMessagesResultObject,
  ListAgentConversationsResultObject,
} from './agent-conversation.object.ts';

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
    private readonly agentConversationsRepository: AgentConversationsRepository,
    private readonly agentConversationMessagesRepository: AgentConversationMessagesRepository,
    private readonly conversationStreamService: ConversationStreamService,
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

    assertPagination(input ?? {}, { max: AGENT_CONVERSATION_LIST_MAX_LIMIT });

    const status = resolveConversationStatus(input?.status);
    const limit = input?.limit ?? undefined;
    const offset = input?.offset ?? undefined;

    const [conversations, totalCount] = await Promise.all([
      this.agentConversationsRepository.listConversationsForUser(user.sub, {
        limit,
        offset,
        status,
      }),
      this.agentConversationsRepository.countConversationsForUser(
        user.sub,
        status,
      ),
    ]);

    const result = new ListAgentConversationsResultObject();

    const items = conversations.map(toAgentConversationObject);

    result.hasNextPage = hasNextPage({ items, totalCount }, offset ?? 0);
    result.items = items;
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
        await this.agentConversationsRepository.getConversationForUser(
          user.sub,
          id,
        );

      return toAgentConversationObject(conversation);
    } catch {
      return null;
    }
  }

  @Query(() => ListAgentConversationMessagesResultObject, {
    description: `List messages for an owned conversation ordered by sort_order ASC (default limit 100 max 500), plus the turn still streaming, if any. fromNewest pages back from the newest message.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async getAgentConversationMessages(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => GetAgentConversationMessagesInput })
    input: GetAgentConversationMessagesInput,
  ): Promise<ListAgentConversationMessagesResultObject> {
    const user = assertHumanAuthPrincipal(principal);

    assertPagination(input, { max: AGENT_CONVERSATION_MESSAGES_MAX_LIMIT });

    const [messages, totalCount] = await Promise.all([
      this.agentConversationMessagesRepository.listMessagesForConversation(
        user.sub,
        input.conversationId,
        {
          fromNewest: input.fromNewest ?? false,
          limit: input.limit ?? undefined,
          offset: input.offset ?? undefined,
        },
      ),
      this.agentConversationMessagesRepository.countMessagesForConversation(
        input.conversationId,
      ),
    ]);

    const result = new ListAgentConversationMessagesResultObject();

    const items = messages.map(toAgentConversationMessageObject);
    // Read only after the list call, which throws for a conversation the caller
    // does not own, so another user's running turn never leaks.
    const activeTurn = this.conversationStreamService.getActiveTurn(
      input.conversationId,
    );

    if (activeTurn === null) {
      result.activeTurn = null;
    } else {
      const activeTurnObject = new AgentConversationActiveTurnObject();
      activeTurnObject.assistantMessageId = activeTurn.assistantMessageId;
      activeTurnObject.startedAt = activeTurn.startedAt;
      result.activeTurn = activeTurnObject;
    }
    result.hasNextPage = hasNextPage({ items, totalCount }, input.offset ?? 0);
    result.items = items;
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
      await this.agentConversationsRepository.createConversation(user.sub, {
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
      await this.agentConversationsRepository.archiveConversation(
        user.sub,
        input.conversationId,
      );

    return toAgentConversationObject(conversation);
  }

  @Mutation(() => AgentConversationObject, {
    description: `Soft-delete an owned agent conversation (status=deleted; row + messages retained, hidden from the default list, reversible).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async deleteAgentConversation(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => DeleteAgentConversationInput })
    input: DeleteAgentConversationInput,
  ): Promise<AgentConversationObject> {
    const user = assertHumanAuthPrincipal(principal);

    const conversation =
      await this.agentConversationsRepository.softDeleteConversation(
        user.sub,
        input.conversationId,
      );

    return toAgentConversationObject(conversation);
  }

  @Mutation(() => AgentConversationObject, {
    description: `Restore a soft-deleted owned agent conversation (deleted -> active). A conversation in any other status is returned unchanged.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async restoreAgentConversation(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => RestoreAgentConversationInput })
    input: RestoreAgentConversationInput,
  ): Promise<AgentConversationObject> {
    const user = assertHumanAuthPrincipal(principal);

    const conversation =
      await this.agentConversationsRepository.restoreConversation(
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
      await this.agentConversationsRepository.updateConversationTitle(
        user.sub,
        input.conversationId,
        input.title,
      );

    return toAgentConversationObject(conversation);
  }

  @Mutation(() => AgentConversationObject, {
    description: `Pin or unpin an owned agent conversation. Does not change its updatedAt.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async setAgentConversationPinned(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => SetAgentConversationPinnedInput })
    input: SetAgentConversationPinnedInput,
  ): Promise<AgentConversationObject> {
    const user = assertHumanAuthPrincipal(principal);

    const conversation =
      await this.agentConversationsRepository.setConversationPinned(
        user.sub,
        input.conversationId,
        input.pinned,
      );

    return toAgentConversationObject(conversation);
  }

  @Mutation(() => AgentConversationObject, {
    description: `Move an owned agent conversation into one of the caller's groups (also clears pinned), or out of any group when groupId is null. Does not change its updatedAt.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async moveAgentConversationToGroup(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => MoveAgentConversationToGroupInput })
    input: MoveAgentConversationToGroupInput,
  ): Promise<AgentConversationObject> {
    const user = assertHumanAuthPrincipal(principal);

    const conversation =
      await this.agentConversationsRepository.moveConversationToGroup(
        user.sub,
        input.conversationId,
        input.groupId,
      );

    return toAgentConversationObject(conversation);
  }
}
