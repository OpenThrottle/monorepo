import type { ChatTurnResult } from '@openthrottle/react-router-chat';
import { SendAgentMessageDocument } from '@openthrottle/openthrottle-developer-codegen';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { AgentsRunChatTurnInputSchema } from '~/__generated__/schemas';

interface CallSendAgentMessageParams {
  readonly conversationId?: string | null;
  readonly message: string;
}

const emptyTurn = (overrides: Partial<ChatTurnResult>): ChatTurnResult => ({
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

  if (message.length === 0) {
    return emptyTurn({
      conversationId: conversationIdFromForm,
      errorMessage: 'Message is required',
    });
  }

  const conversationId =
    conversationIdFromForm != null ? conversationIdFromForm : undefined;

  try {
    return await callSendAgentMessage(request, { conversationId, message });
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
 * @description Call `agentsRunChatTurn` on openthrottle-server with auth from the request cookie.
 */
async function callSendAgentMessage(
  request: Request,
  params: CallSendAgentMessageParams,
): Promise<ChatTurnResult> {
  const input = AgentsRunChatTurnInputSchema().parse({
    conversationId: params.conversationId ?? undefined,
    message: params.message,
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
