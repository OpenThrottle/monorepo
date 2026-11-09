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
