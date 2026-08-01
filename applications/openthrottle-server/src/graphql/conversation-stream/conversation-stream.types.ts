/**
 * @description Shared shapes for the conversation streaming feature. The publish
 * envelope key MUST equal the subscription resolver field name so @nestjs/graphql
 * can resolve conversationStreamChunkAdded (mirrors appendPlanOutput -> planOutputChunkAdded).
 */

/** Subscription field name; used as the PubSub publish envelope key. */
export const CONVERSATION_STREAM_CHUNK_FIELD =
  'conversationStreamChunkAdded' as const;

/** A single streamed chunk published to `conversation:<conversationId>:stream`. */
export interface ConversationStreamChunkPayload {
  /** Conversation the chunk belongs to. */
  readonly conversationId: string;
  /** Incremental assistant text (empty on the terminal chunk). */
  readonly delta: string;
  /** True exactly once, on the terminal chunk. */
  readonly done: boolean;
  /** Error message when the stream failed; null otherwise. */
  readonly error: string | null;
  /** Unique id for this chunk (subscription dedupe / cursor). */
  readonly id: string;
  /** Event kind: text | thinking | tool_call | tool_result | usage | session. */
  readonly kind: string;
  /** Assistant message id the deltas accumulate into. */
  readonly messageId: string;
  /** JSON-encoded structured metadata for non-text kinds (tool args, usage, …); null otherwise. */
  readonly metadataJson: string | null;
  /** Monotonic index within the stream. */
  readonly sortOrder: number;
}

/**
 * Machine-readable marker carried on a terminal (`done: true`) chunk's
 * `metadataJson` when the orchestrator idle-timeout backstop fired, so the
 * client can distinguish "timed out — safe to retry" from a fatal error. A
 * healthy completion and a fatal failure both leave `metadataJson` null.
 */
export interface TerminalTimeoutMetadata {
  /** The client reads this to decide whether to auto-retry the turn. */
  readonly retryable: boolean;
  /** Provenance marker: the terminal chunk was synthesized by the idle timeout. */
  readonly timedOut: boolean;
}

/**
 * PubSub publish envelope. The key MUST equal {@link CONVERSATION_STREAM_CHUNK_FIELD}
 * (the subscription field name) so @nestjs/graphql resolves the payload. Buffered
 * replay yields the same envelope shape as the live PubSub iterator.
 */
export interface ConversationStreamChunkEnvelope {
  readonly conversationStreamChunkAdded: ConversationStreamChunkPayload;
}
