/**
 * @description App-level max UTF-8 byte length for message content (not enforced in the database).
 * @public
 */
export const AGENT_CONVERSATION_CONTENT_MAX_BYTES = 256 * 1024;

/**
 * @description App-level max UTF-8 byte length for `tool_metadata` JSON (not enforced in the
 * database).
 * @public
 */
export const AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES = 64 * 1024;

/**
 * @description Key set to `true` on a persisted event's `metadata` when one of its
 * payloads (`toolCall`, `partialJson`, `result`, or the event's `delta`) was clipped
 * to fit {@link AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES}. The chat client reads the
 * same key to show "Output truncated when saved" on the card.
 * @public
 */
export const AGENT_CONVERSATION_PAYLOAD_TRUNCATED_KEY = 'payloadTruncated';

/** @public */
export const AGENT_CONVERSATION_LIST_DEFAULT_LIMIT = 20;

/** @public */
export const AGENT_CONVERSATION_LIST_MAX_LIMIT = 100;

/** @public */
export const AGENT_CONVERSATION_MESSAGES_DEFAULT_LIMIT = 100;

/** @public */
export const AGENT_CONVERSATION_MESSAGES_MAX_LIMIT = 500;

/**
 * @description Values of `agent_conversations.status`. `deleted` always travels with a
 * `deleted_at` stamp (migration 180), so a deleted conversation is invisible to every
 * repository read.
 * @public
 */
export const AGENT_CONVERSATION_STATUSES = {
  active: 'active',
  archived: 'archived',
  deleted: 'deleted',
} as const;
