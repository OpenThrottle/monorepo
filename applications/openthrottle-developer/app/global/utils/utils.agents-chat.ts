import type { ChatTurnResult } from '@openthrottle/react-router-chat';
import { SendAgentMessageDocument } from '@openthrottle/openthrottle-developer-codegen';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { AgentsRunChatTurnInputSchema } from '~/__generated__/schemas';

export interface CallSendAgentMessageParams {
  readonly conversationId?: string | null;
  readonly message: string;
}

/**
 * @description Call `agentsRunChatTurn` on openthrottle-server with auth from the request cookie.
 */
/**
 * @description Root action handler for `intent: send-agent-message` — validates FormData and returns JSON for fetchers.
 */
export async function handleSendAgentMessageIntent(
  request: Request,
  formData: FormData,
): Promise<ChatTurnResult> {
  const messageRaw = formData.get('message');
  const message = typeof messageRaw === 'string' ? messageRaw.trim() : '';

  if (message.length === 0) {
    return {
      assistantText: null,
      errorMessage: 'Message is required',
      toolMetadataJson: null,
    };
  }

  const conversationIdRaw = formData.get('conversationId');
  const conversationId =
    typeof conversationIdRaw === 'string' && conversationIdRaw.trim().length > 0
      ? conversationIdRaw.trim()
      : undefined;

  try {
    return await callSendAgentMessage(request, { conversationId, message });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to send message';

    return {
      assistantText: null,
      errorMessage,
      toolMetadataJson: null,
    };
  }
}

export async function callSendAgentMessage(
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
    errorMessage: turn.errorMessage ?? null,
    toolMetadataJson: turn.toolMetadataJson ?? null,
  };
}
