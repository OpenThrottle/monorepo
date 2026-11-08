/**
 * @description Shared shapes for the streaming transcription feature. The publish
 * envelope key MUST equal the subscription resolver field name so @nestjs/graphql
 * can resolve transcriptionStreamChunkAdded (mirrors conversationStreamChunkAdded).
 *
 * Snapshot-replace semantics: every chunk carries the FULL transcript so far —
 * WhisperLive partials revise the tail segment (unlike append-only LLM token
 * streams), so clients replace their state with the highest-sortOrder snapshot
 * instead of accumulating deltas. There is deliberately no delta field.
 */

/** Subscription field name; used as the PubSub publish envelope key. */
export const TRANSCRIPTION_STREAM_CHUNK_FIELD =
  'transcriptionStreamChunkAdded' as const;
