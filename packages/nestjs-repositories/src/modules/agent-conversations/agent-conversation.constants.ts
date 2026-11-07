/** App-level max UTF-8 byte length for message content (not enforced in DB). */
export const AGENT_CONVERSATION_CONTENT_MAX_BYTES = 256 * 1024;

/** App-level max UTF-8 byte length for tool_metadata JSON (not enforced in DB). */
export const AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES = 64 * 1024;

/**
 * @description Key set to `true` on a persisted event's `metadata` when one of its
 * payloads (`toolCall`, `partialJson`, `result`, or the event's `delta`) was clipped
 * to fit {@link AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES}. The chat client reads the
 * same key to show "Output truncated when saved" on the card.
 * @public
 */
export const AGENT_CONVERSATION_PAYLOAD_TRUNCATED_KEY = 'payloadTruncated';

export const AGENT_CONVERSATION_LIST_DEFAULT_LIMIT = 20;
export const AGENT_CONVERSATION_LIST_MAX_LIMIT = 100;

export const AGENT_CONVERSATION_MESSAGES_DEFAULT_LIMIT = 100;
export const AGENT_CONVERSATION_MESSAGES_MAX_LIMIT = 500;

export const AGENT_CONVERSATION_STATUSES = {
  active: 'active',
  archived: 'archived',
  deleted: 'deleted',
} as const;

export type AgentConversationStatus =
  (typeof AGENT_CONVERSATION_STATUSES)[keyof typeof AGENT_CONVERSATION_STATUSES];

export const AGENT_CONVERSATION_MESSAGE_ROLES = {
  assistant: 'assistant',
  system: 'system',
  tool: 'tool',
  user: 'user',
} as const;

export type AgentConversationMessageRole =
  (typeof AGENT_CONVERSATION_MESSAGE_ROLES)[keyof typeof AGENT_CONVERSATION_MESSAGE_ROLES];
