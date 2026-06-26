import { buildAgentsChatAssistantFooter } from './agents-chat-footer';
import { foldPersistedTurnEvents } from './turn-events';
import type { ChatMessage, ChatTurnResult } from './types';

export interface PersistedAgentConversationMessage {
  readonly content: string;
  readonly createdAt: string;
  readonly id: string;
  readonly role: string;
  readonly routingConfidence: number | null;
  readonly routingReason: string | null;
  readonly toolMetadataJson: string | null;
}

const parseMcpToolFromToolMetadataJson = (
  toolMetadataJson: string | null,
): string | null => {
  if (toolMetadataJson == null || toolMetadataJson.trim() === '') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(toolMetadataJson);

    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const tool = (parsed as Record<string, unknown>).tool;

    return typeof tool === 'string' && tool.length > 0 ? tool : null;
  } catch {
    return null;
  }
};

const toAssistantFooter = (
  message: PersistedAgentConversationMessage,
): string | null => {
  const turn: ChatTurnResult = {
    assistantText: message.content,
    conversationId: null,
    errorMessage: null,
    mcpTool: parseMcpToolFromToolMetadataJson(message.toolMetadataJson),
    readOnlyAgentsChat: true,
    routingConfidence: message.routingConfidence,
    routingReason: message.routingReason,
    structuredPayloadJson: null,
    toolMetadataJson: message.toolMetadataJson,
  };

  return buildAgentsChatAssistantFooter(turn);
};

const toChatMessageRole = (role: string): ChatMessage['role'] | null => {
  if (role === 'user' || role === 'assistant' || role === 'system') {
    return role;
  }

  return null;
};

/**
 * @description Maps persisted agent conversation rows into local chat thread messages.
 */
export const mapPersistedAgentConversationMessages = (
  messages: readonly PersistedAgentConversationMessage[],
): readonly ChatMessage[] => {
  const mapped: ChatMessage[] = [];

  for (const message of messages) {
    const role = toChatMessageRole(message.role);

    if (role == null) {
      continue;
    }

    // Hydrate the rich timeline for assistant turns that persisted non-text
    // events (thinking/tool). Plain turns fold to [] and keep the flat body.
    const events =
      role === 'assistant'
        ? foldPersistedTurnEvents(message.toolMetadataJson, message.content)
        : [];

    mapped.push({
      body: message.content,
      createdAt: message.createdAt,
      ...(events.length > 0 ? { events } : {}),
      footer: role === 'assistant' ? toAssistantFooter(message) : null,
      id: message.id,
      role,
    });
  }

  return mapped;
};
