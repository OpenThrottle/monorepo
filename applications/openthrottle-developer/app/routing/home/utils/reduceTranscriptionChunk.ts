import type { TranscriptionStreamChunkFragment } from '~/__generated__/graphql';
import type { TranscriptionSnapshot } from '~/routing/home/types';

/**
 * Pure reducer: keep the highest-sortOrder snapshot (replace, never append).
 * Out-of-order or duplicate chunks are dropped; `done` latches once seen.
 */
export function reduceTranscriptionChunk(
  state: TranscriptionSnapshot,
  chunk: TranscriptionStreamChunkFragment,
): TranscriptionSnapshot {
  if (chunk.sortOrder <= state.sortOrder) {
    return state;
  }

  return {
    done: state.done || chunk.done,
    error: chunk.error ?? state.error,
    sortOrder: chunk.sortOrder,
    transcript: chunk.transcript,
  };
}
