import { isRecord } from '@openthrottle/nodejs-utils';
import {
  AGENT_CONVERSATION_CONTENT_MAX_BYTES,
  AGENT_CONVERSATION_LIST_DEFAULT_LIMIT,
  AGENT_CONVERSATION_LIST_MAX_LIMIT,
  AGENT_CONVERSATION_MESSAGES_DEFAULT_LIMIT,
  AGENT_CONVERSATION_MESSAGES_MAX_LIMIT,
  AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES,
} from './agent-conversation.constants';

/** Marks UTF-8 continuation bytes (0b10xxxxxx) when backing off to a code-point boundary. */
const UTF8_CONTINUATION_MASK = 0b1100_0000;
const UTF8_CONTINUATION_VALUE = 0b1000_0000;

const truncateUtf8 = (
  value: string,
  maxBytes: number,
): { readonly truncated: boolean; readonly value: string } => {
  const buffer = Buffer.from(value, 'utf8');
  if (buffer.byteLength <= maxBytes) {
    return { truncated: false, value };
  }

  // Cut on the byte side (O(n)) — shrinking the string one char at a time
  // re-encodes the whole prefix per step and goes quadratic on large inputs.
  let end = maxBytes;
  while (
    end > 0 &&
    ((buffer[end] ?? 0) & UTF8_CONTINUATION_MASK) === UTF8_CONTINUATION_VALUE
  ) {
    end -= 1;
  }

  return { truncated: true, value: buffer.subarray(0, end).toString('utf8') };
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
    const parsed: unknown = JSON.parse(value);
    if (isRecord(parsed)) {
      return {
        toolMetadata: { ...parsed, truncated: true },
        toolMetadataTruncated: true,
      };
    }
  } catch {
    // Fall through to the truncated-marker envelope below.
  }

  return {
    toolMetadata: { truncated: true },
    toolMetadataTruncated: true,
  };
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
