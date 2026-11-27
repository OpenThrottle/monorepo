/** Subscription field name; used as the PubSub publish envelope key. */
export const CONVERSATION_STREAM_CHUNK_FIELD =
  'conversationStreamChunkAdded' as const;

/**
 * `errorMessage` returned when a start mutation targets a conversation whose
 * previous turn is still running. Clients queue the message instead.
 */
export const TURN_IN_PROGRESS_ERROR = `A reply is still running in this conversation. Wait for it to finish or stop it, then send again.`;

/**
 * How many of a conversation's newest messages a persisted turn sends as its
 * prompt history. The repository's default page, so one read covers it.
 */
export const PROMPT_HISTORY_WINDOW = 100;

/**
 * Chunk `kind` of a turn's first chunk: the user message that started it, so a
 * tab already open on the conversation can show a prompt sent from another.
 * `delta` is the message text, `metadataJson` carries `{ userMessageId }`, and
 * `messageId` is the turn's assistant id. Server-published only; no backend
 * emits it. Persisted turns only: a Private-mode turn has no other viewer.
 */
export const USER_MESSAGE_CHUNK_KIND = 'user_message';
