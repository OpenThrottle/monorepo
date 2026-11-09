/**
 * @description Persistence helpers for agentsRunChatTurn (human JWT user-scoped).
 */
import { NotFoundException } from '@nestjs/common';
import {
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
  type UserAuthPrincipal,
} from '@openthrottle/nestjs-auth';
import type { AgentConversationsService } from '@openthrottle/nestjs-repositories';
import { deriveConversationTitleFromMessage } from '@openthrottle/nestjs-repositories';
import { isRecord } from '@openthrottle/nodejs-utils';

import type { AgentsChatTurnResult } from '../agents.object.ts';
import type { AgentsMcpRouteDecision } from '../mcp-router/mcp-router.types.ts';
import type { AgentsRouterModelSnapshot } from '../mcp-router-llm/mcp-router-llm.types.ts';
import { PERSISTED_CONVERSATION_NOT_FOUND_ERROR } from './chat-persistence.constants.ts';
import type { ResolvePersistedConversationResult } from './chat-persistence.types.ts';

/**
 * @description Returns the human JWT principal when present; otherwise null.
 */
export const resolveHumanUserForPersist = (
  principal: AuthPrincipal | undefined,
): UserAuthPrincipal | null => {
  if (principal?.kind !== AUTH_PRINCIPAL_KIND_USER) {
    return null;
  }

  return principal;
};

interface ResolvePersistedConversationInput {
  readonly conversationId: string | null | undefined;
  readonly message: string;
  readonly userId: string;
}

/**
 * @description Validates an owned conversation id or mints a new conversation row.
 */
export const resolvePersistedConversation = async (
  agentConversationsService: AgentConversationsService,
  input: ResolvePersistedConversationInput,
): Promise<ResolvePersistedConversationResult> => {
  const trimmedConversationId = input.conversationId?.trim();

  if (trimmedConversationId != null && trimmedConversationId.length > 0) {
    try {
      await agentConversationsService.getConversationForUser(
        input.userId,
        trimmedConversationId,
      );

      return { conversationId: trimmedConversationId, ok: true };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        return {
          errorMessage: PERSISTED_CONVERSATION_NOT_FOUND_ERROR,
          ok: false,
        };
      }

      throw error;
    }
  }

  const conversation = await agentConversationsService.createConversation(
    input.userId,
    {
      title: deriveConversationTitleFromMessage(input.message),
    },
  );

  return { conversationId: conversation.id, ok: true };
};

interface PersistSuccessfulAgentsChatTurnInput {
  readonly agentConversationsService: AgentConversationsService;
  readonly conversationId: string;
  readonly llmRouterUsed: boolean;
  readonly message: string;
  readonly route: AgentsMcpRouteDecision;
  readonly routerModelSnapshot: AgentsRouterModelSnapshot | null;
  readonly turn: AgentsChatTurnResult;
  readonly userId: string;
}

/**
 * @description Parses tool metadata JSON from a successful turn into a record for storage.
 */
export const parseAgentsChatTurnToolMetadata = (
  toolMetadataJson: string | null,
): Record<string, unknown> | null => {
  if (toolMetadataJson == null || toolMetadataJson.trim() === '') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(toolMetadataJson);

    if (isRecord(parsed)) {
      return parsed;
    }

    return { value: parsed };
  } catch {
    return { raw: toolMetadataJson };
  }
};

/**
 * @description Appends a successful chat turn to the persisted conversation.
 */
export const persistSuccessfulAgentsChatTurn = async (
  input: PersistSuccessfulAgentsChatTurnInput,
): Promise<void> => {
  const assistantContent = input.turn.assistantText ?? '';
  const toolMetadata = parseAgentsChatTurnToolMetadata(
    input.turn.toolMetadataJson,
  );
  const requestedSnapshot = input.routerModelSnapshot ?? null;
  const routerModelSnapshot = input.llmRouterUsed ? requestedSnapshot : null;

  await input.agentConversationsService.appendTurn(
    input.userId,
    input.conversationId,
    {
      assistantContent,
      modelName: routerModelSnapshot?.modelName ?? null,
      modelProvider: routerModelSnapshot?.modelProvider ?? null,
      routingConfidence: input.route.confidence,
      routingModel: routerModelSnapshot?.modelName ?? null,
      routingReason: input.route.reason,
      routingTier: input.llmRouterUsed ? 'llm' : 'heuristic',
      toolMetadata,
      userContent: input.message,
    },
  );
};
