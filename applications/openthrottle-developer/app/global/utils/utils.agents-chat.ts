import type {
  ChatTurnResult,
  LoadAgentConversationMessagesResult,
} from '@openthrottle/react-router-chat';
import { mapPersistedAgentConversationMessages } from '@openthrottle/react-router-chat';
import {
  GetAgentConversationMessagesDocument,
  SendAgentMessageDocument,
} from '@openthrottle/openthrottle-developer-codegen';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { AgentsRunChatTurnInputSchema } from '~/__generated__/schemas';

export interface CallSendAgentMessageParams {
  readonly conversationId?: string | null;
  readonly message: string;
  readonly persist?: boolean;
}

export interface CallLoadAgentConversationMessagesParams {
  readonly conversationId: string;
  readonly limit?: number;
}

export const emptyTurn = (
  overrides: Partial<ChatTurnResult>,
): ChatTurnResult => ({
  assistantText: null,
  conversationId: null,
  errorMessage: null,
  mcpTool: null,
  readOnlyAgentsChat: true,
  routingConfidence: null,
  routingReason: null,
  structuredPayloadJson: null,
  toolMetadataJson: null,
  ...overrides,
});

export const emptyLoadAgentConversationMessagesResult = (
  overrides: Partial<LoadAgentConversationMessagesResult>,
): LoadAgentConversationMessagesResult => ({
  conversationId: null,
  errorMessage: null,
  messages: [],
  ...overrides,
});

const parsePersistFormFlag = (value: FormDataEntryValue | null): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

/**
 * @description Root action handler for `intent: load-agent-conversation-messages`.
 */
export async function handleLoadAgentConversationMessagesIntent(
  request: Request,
  formData: FormData,
): Promise<LoadAgentConversationMessagesResult> {
  const conversationIdRaw = formData.get('conversationId');
  const conversationId =
    typeof conversationIdRaw === 'string' && conversationIdRaw.trim().length > 0
      ? conversationIdRaw.trim()
      : null;

  if (conversationId == null) {
    return emptyLoadAgentConversationMessagesResult({
      errorMessage: 'conversationId is required',
    });
  }

  try {
    return await callLoadAgentConversationMessages(request, {
      conversationId,
      limit: 100,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to load conversation';

    return emptyLoadAgentConversationMessagesResult({
      conversationId,
      errorMessage,
    });
  }
}

/**
 * @description Root action handler for `intent: send-agent-message` — validates FormData and returns JSON for fetchers.
 */
export async function handleSendAgentMessageIntent(
  request: Request,
  formData: FormData,
): Promise<ChatTurnResult> {
  const messageRaw = formData.get('message');
  const message = typeof messageRaw === 'string' ? messageRaw.trim() : '';

  const conversationIdRaw = formData.get('conversationId');
  const conversationIdFromForm =
    typeof conversationIdRaw === 'string' && conversationIdRaw.trim().length > 0
      ? conversationIdRaw.trim()
      : null;

  const persist = parsePersistFormFlag(formData.get('persist'));

  if (message.length === 0) {
    return emptyTurn({
      conversationId: conversationIdFromForm,
      errorMessage: 'Message is required',
    });
  }

  const conversationId =
    conversationIdFromForm != null ? conversationIdFromForm : undefined;

  try {
    return await callSendAgentMessage(request, {
      conversationId,
      message,
      persist,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to send message';

    return emptyTurn({
      conversationId: conversationIdFromForm,
      errorMessage,
    });
  }
}

/**
 * @description Load persisted agent conversation messages for the authenticated user.
 */
export async function callLoadAgentConversationMessages(
  request: Request,
  params: CallLoadAgentConversationMessagesParams,
): Promise<LoadAgentConversationMessagesResult> {
  const data = await executeGraphqlWithAuth(
    request,
    GetAgentConversationMessagesDocument,
    {
      input: {
        conversationId: params.conversationId,
        limit: params.limit ?? 100,
      },
    },
  );

  const messages = mapPersistedAgentConversationMessages(
    data.getAgentConversationMessages.messages.map((message) => ({
      content: message.content,
      createdAt: message.createdAt,
      id: message.id,
      role: message.role,
      routingConfidence: message.routingConfidence ?? null,
      routingReason: message.routingReason ?? null,
      toolMetadataJson: message.toolMetadataJson ?? null,
    })),
  );

  return emptyLoadAgentConversationMessagesResult({
    conversationId: params.conversationId,
    messages,
  });
}

/**
 * @description Call `agentsRunChatTurn` on openthrottle-server with auth from the request cookie.
 */
export async function callSendAgentMessage(
  request: Request,
  params: CallSendAgentMessageParams,
): Promise<ChatTurnResult> {
  const input = AgentsRunChatTurnInputSchema().parse({
    conversationId: params.conversationId ?? undefined,
    message: params.message,
    persist: params.persist ?? false,
  });

  const data = await executeGraphqlWithAuth(request, SendAgentMessageDocument, {
    input,
  });

  const turn = data.agentsRunChatTurn;

  return {
    assistantText: turn.assistantText ?? null,
    conversationId: turn.conversationId ?? null,
    errorMessage: turn.errorMessage ?? null,
    mcpTool: turn.mcpTool ?? null,
    readOnlyAgentsChat: turn.readOnlyAgentsChat ?? true,
    routingConfidence: turn.routingConfidence ?? null,
    routingReason: turn.routingReason ?? null,
    structuredPayloadJson: turn.structuredPayloadJson ?? null,
    toolMetadataJson: turn.toolMetadataJson ?? null,
  };
}
