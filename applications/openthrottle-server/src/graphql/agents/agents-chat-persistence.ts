/**
 * @description Persistence helpers for agentsRunChatTurn (human JWT user-scoped).
 */

import {
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
  type UserAuthPrincipal,
} from '@openthrottle/nestjs-auth';
import {
  AgentConversationsService,
  deriveConversationTitleFromMessage,
} from '@openthrottle/nestjs-repositories';
import { NotFoundException } from '@nestjs/common';
import type { AgentsRouterModelSnapshot } from './agents-mcp-router-llm.service';
import type { AgentsMcpRouteDecision } from './agents-mcp-router';
import type { AgentsChatTurnResult } from './agents.object';

export type { AgentsRouterModelSnapshot };

export const PERSISTED_CONVERSATION_AUTH_ERROR =
  'Authentication required for persisted conversations.';

export const PERSISTED_CONVERSATION_NOT_FOUND_ERROR =
  'Agent conversation not found.';

/** Narrows to a plain (non-array) object record. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

interface ResolvePersistedConversationSuccess {
  readonly conversationId: string;
  readonly ok: true;
}

interface ResolvePersistedConversationFailure {
  readonly errorMessage: string;
  readonly ok: false;
}

export type ResolvePersistedConversationResult =
  | ResolvePersistedConversationFailure
  | ResolvePersistedConversationSuccess;

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
  const routerModelSnapshot =
    input.llmRouterUsed && input.routerModelSnapshot != null
      ? input.routerModelSnapshot
      : null;

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
