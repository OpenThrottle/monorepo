/** Subscription field name; used as the PubSub publish envelope key. */
export const CONVERSATION_STREAM_CHUNK_FIELD =
  'conversationStreamChunkAdded' as const;

/**
 * `errorMessage` returned when a start mutation targets a conversation whose
 * previous turn is still running. Clients queue the message instead.
 */
export const TURN_IN_PROGRESS_ERROR = `A reply is still running in this conversation. Wait for it to finish or stop it, then send again.`;
