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

/** A single transcript snapshot published to `transcription:<sessionId>:stream`. */
export interface TranscriptionStreamChunkPayload {
  /** True exactly once, on the terminal chunk (stop, idle reap, or hard cap). */
  readonly done: boolean;
  /** Error message when the session failed or was reaped; null otherwise. */
  readonly error: string | null;
  /** Transcription session the snapshot belongs to. */
  readonly sessionId: string;
  /** Monotonic index within the stream; clients keep the highest one. */
  readonly sortOrder: number;
  /** Full transcript so far (completed segments + current revising tail). */
  readonly transcript: string;
}
