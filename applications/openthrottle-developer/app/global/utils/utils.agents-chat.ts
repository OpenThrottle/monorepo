import {
  createAgentConversationsApi,
  type ChatTurnResult,
} from '@openthrottle/react-router-chat';
import {
  DeleteAgentConversationDocument,
  GetAgentConversationMessagesDocument,
  ListAgentConversationsDocument,
  SendAgentMessageDocument,
  UpdateAgentConversationTitleDocument,
} from '@openthrottle/openthrottle-developer-codegen';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { AgentsRunChatTurnInputSchema } from '~/__generated__/schemas';

/**
 * @description Persisted-conversation CRUD (list / load-messages / rename /
 * soft-delete) for the home + header chat sidebar/switcher. The CRUD logic is
 * single-sourced in `@openthrottle/react-router-chat`
 * ({@link createAgentConversationsApi}); this module only supplies the app's
 * generated documents.
 */
const agentConversations = createAgentConversationsApi({
  deleteDocument: DeleteAgentConversationDocument,
  getMessagesDocument: GetAgentConversationMessagesDocument,
  listDocument: ListAgentConversationsDocument,
  updateTitleDocument: UpdateAgentConversationTitleDocument,
});

export const callListAgentConversations =
  agentConversations.callListAgentConversations;
export const callLoadAgentConversationMessages =
  agentConversations.callLoadAgentConversationMessages;
export const handleDeleteAgentConversationIntent =
  agentConversations.handleDeleteAgentConversationIntent;
export const handleListAgentConversationsIntent =
  agentConversations.handleListAgentConversationsIntent;
export const handleLoadAgentConversationMessagesIntent =
  agentConversations.handleLoadAgentConversationMessagesIntent;
export const handleRenameAgentConversationIntent =
  agentConversations.handleRenameAgentConversationIntent;

// ---------------------------------------------------------------------------
// Legacy non-streaming MCP-tool-router turn path (deliberately DELIMITED, kept).
//
// `agentsRunChatTurn` is NOT a model completion: it is the read-only agents-chat
// MCP-tool-router (it returns mcpTool / routingConfidence / routingReason /
// structuredPayloadJson, not streamed model tokens). It backs the `send-agent-message`
// intent posted by `LegacyChatTurnProvider` (react-router-ui-global), which
// `GlobalProviders` renders as the fallback when NO streaming chat surface is
// injected — i.e. the logged-out header chat. The primary, authenticated chat
// streams via `/resources/conversation-stream` instead. This path is retained on
// purpose (removing it would break the logged-out fallback and needs coordination
// with the openthrottle-drivers work, plan dde67342); it is intentionally scoped
// to this app and not consolidated into the shared streaming surface.
// ---------------------------------------------------------------------------

export interface CallSendAgentMessageParams {
  readonly conversationId?: string | null;
  readonly message: string;
  readonly persist?: boolean;
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

const parsePersistFormFlag = (value: FormDataEntryValue | null): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

/**
 * @description Root action handler for `intent: send-agent-message` — validates
 * FormData and returns JSON for the legacy (logged-out) header-chat fetcher.
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
 * @description Call `agentsRunChatTurn` (the read-only MCP-tool-router) on
 * openthrottle-server with auth from the request cookie.
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
