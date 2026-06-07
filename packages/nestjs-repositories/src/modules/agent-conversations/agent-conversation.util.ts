import {
  AGENT_CONVERSATION_CONTENT_MAX_BYTES,
  AGENT_CONVERSATION_LIST_DEFAULT_LIMIT,
  AGENT_CONVERSATION_LIST_MAX_LIMIT,
  AGENT_CONVERSATION_MESSAGES_DEFAULT_LIMIT,
  AGENT_CONVERSATION_MESSAGES_MAX_LIMIT,
  AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES,
} from './agent-conversation.constants';

const truncateUtf8 = (
  value: string,
  maxBytes: number,
): { readonly truncated: boolean; readonly value: string } => {
  if (Buffer.byteLength(value, 'utf8') <= maxBytes) {
    return { truncated: false, value };
  }

  let end = value.length;
  while (end > 0 && Buffer.byteLength(value.slice(0, end), 'utf8') > maxBytes) {
    end -= 1;
  }

  return { truncated: true, value: value.slice(0, end) };
};

/**
 * @description Derives a conversation title from the first user message (~80 chars).
 */
export const deriveConversationTitleFromMessage = (content: string): string => {
  const trimmed = content.trim();
  if (trimmed.length <= 80) {
    return trimmed;
  }

  return `${trimmed.slice(0, 80).trimEnd()}…`;
};

/**
 * @description Caps message content to the app-level UTF-8 byte limit.
 */
export const capAgentConversationContent = (
  content: string,
): { readonly content: string; readonly contentTruncated: boolean } => {
  const { truncated, value } = truncateUtf8(
    content,
    AGENT_CONVERSATION_CONTENT_MAX_BYTES,
  );

  return { content: value, contentTruncated: truncated };
};

/**
 * @description Caps tool_metadata JSON and sets `truncated: true` in the envelope when clipped.
 */
export const capAgentConversationToolMetadata = (
  toolMetadata: Record<string, unknown> | null | undefined,
): {
  readonly toolMetadata: Record<string, unknown> | null;
  readonly toolMetadataTruncated: boolean;
} => {
  if (toolMetadata == null) {
    return { toolMetadata: null, toolMetadataTruncated: false };
  }

  const serialized = JSON.stringify(toolMetadata);
  const { truncated, value } = truncateUtf8(
    serialized,
    AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES,
  );

  if (!truncated) {
    return { toolMetadata, toolMetadataTruncated: false };
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return {
      toolMetadata: { ...parsed, truncated: true },
      toolMetadataTruncated: true,
    };
  } catch {
    return {
      toolMetadata: { truncated: true },
      toolMetadataTruncated: true,
    };
  }
};

/**
 * @description Clamps list pagination limit to allowed bounds.
 */
export const clampAgentConversationListLimit = (
  limit: number | undefined,
): number => {
  const resolved = limit ?? AGENT_CONVERSATION_LIST_DEFAULT_LIMIT;
  return Math.min(Math.max(resolved, 1), AGENT_CONVERSATION_LIST_MAX_LIMIT);
};

/**
 * @description Clamps message list pagination limit to allowed bounds.
 */
export const clampAgentConversationMessagesLimit = (
  limit: number | undefined,
): number => {
  const resolved = limit ?? AGENT_CONVERSATION_MESSAGES_DEFAULT_LIMIT;
  return Math.min(Math.max(resolved, 1), AGENT_CONVERSATION_MESSAGES_MAX_LIMIT);
};
