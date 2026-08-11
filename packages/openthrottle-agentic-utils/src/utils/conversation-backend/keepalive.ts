/**
 * Keepalive liveness bridging for spawned CLI backends.
 *
 * Every CLI backend guards a turn with two idle timers that must measure the
 * SAME signal but historically did not:
 *  - the backend's own idle timer resets on ANY stdout byte from the child;
 *  - the server orchestrator's idle backstop
 *    ({@link ConversationStreamService.withIdleTimeout}) resets only when the
 *    backend YIELDS a mapped chunk.
 *
 * When the child emits stdout that maps to no chunk — plugin startup hooks,
 * status/rate-limit events, or a partial line while a slow first token streams
 * in — the backend stays alive (its stdout timer keeps resetting) but yields
 * nothing, so the server backstop sees no activity and aborts a live turn.
 *
 * The fix: for every stdout read that produces no mapped chunk, emit a single
 * {@link CONVERSATION_KEEPALIVE_CHUNK}. It carries no text and no payload; the
 * orchestrator consumes it purely to reset the backstop in lockstep with the
 * child's stdout timer, then drops it — it is never published, persisted, or
 * shown to the client.
 */

import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationStreamChunk,
} from './types.ts';

/**
 * The single liveness chunk a backend emits when a stdout read produced no
 * mapped chunk. Frozen and shared: it is stateless and dropped by the
 * orchestrator, so one instance is safe to reuse across every backend and read.
 *
 * @public
 */
export const CONVERSATION_KEEPALIVE_CHUNK: ConversationStreamChunk =
  Object.freeze({
    delta: '',
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.keepalive,
  });

/**
 * Yield every chunk produced for one stdout read; if that read produced none,
 * yield a single {@link CONVERSATION_KEEPALIVE_CHUNK} instead so the read still
 * registers as activity on the server's idle backstop. Wrap the per-read emitter
 * with this — never the end-of-stream flush, which needs no liveness signal.
 *
 * @public
 */
export function* withKeepalive(
  chunks: Iterable<ConversationStreamChunk>,
): Generator<ConversationStreamChunk> {
  let produced = false;
  for (const chunk of chunks) {
    produced = true;
    yield chunk;
  }
  if (!produced) {
    yield CONVERSATION_KEEPALIVE_CHUNK;
  }
}
