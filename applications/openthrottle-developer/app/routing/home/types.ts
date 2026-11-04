import type { TranscriptionStreamChunkAddedSubscription } from '~/__generated__/graphql';

/** One chunk delivered by the `transcriptionStreamChunkAdded` subscription. */
export type TranscriptionChunk =
  TranscriptionStreamChunkAddedSubscription['transcriptionStreamChunkAdded'];

export interface TranscriptionSnapshot {
  /** True once the terminal chunk arrived (stop, idle reap, or hard cap). */
  readonly done: boolean;
  /** Stream error carried by the terminal chunk (session reaped, upstream loss). */
  readonly error: string | null;
  /** sortOrder of the snapshot currently held (-1 before any chunk). */
  readonly sortOrder: number;
  /** Full transcript so far — replaced wholesale, never appended. */
  readonly transcript: string;
}
