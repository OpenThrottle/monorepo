/**
 * Maps `grok --output-format streaming-json` JSONL events onto
 * {@link ConversationStreamChunk}s. The rules are the empirically-verified ones
 * in docs/openthrottle/grok-stream-json-schema.md §9 (captured verbatim from
 * live grok 0.2.112 runs).
 *
 * grok's stream is flat, incremental, and simple: `{type:'thought',data}` →
 * thinking deltas, `{type:'text',data}` → text deltas, and a single terminal
 * `{type:'end', sessionId, usage, modelUsage, stopReason}`. The mapper is
 * stateless; the `end` event yields TWO chunks — a `session` chunk (done:false,
 * so `ConversationStreamService` persists the minted id for resume) followed by
 * the terminal `usage` chunk (done:true). Tool executions are NOT surfaced as
 * discrete events in this headless mode (only thought/text/end), so there is no
 * tool_call/tool_result mapping.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import { CONVERSATION_STREAM_CHUNK_KINDS } from '../types.ts';
import type { ConversationStreamChunk } from '../types.ts';

const asString = (value: unknown): string | undefined => {
  const isString = typeof value === 'string';

  return isString ? value : undefined;
};

/**
 * Map a single grok event to zero or more chunks. `thought`/`text` → one delta
 * chunk each; `end` → a `session` chunk (minted id) then the terminal `usage`
 * chunk; a defensive `error` event → a terminal error chunk. Everything else is
 * skipped (empty array).
 *
 * @public
 */
export function mapGrokEvent(event: unknown): ConversationStreamChunk[] {
  if (!isRecord(event)) {
    return [];
  }

  switch (event.type) {
    case 'thought':
      return [
        {
          delta: asString(event.data) ?? '',
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.thinking,
        },
      ];

    case 'text':
      return [
        {
          delta: asString(event.data) ?? '',
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
        },
      ];

    case 'end': {
      const chunks: ConversationStreamChunk[] = [];
      const sessionId = asString(event.sessionId);
      if (sessionId !== undefined && sessionId !== '') {
        chunks.push({
          delta: '',
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.session,
          metadata: { sessionId },
        });
      }
      chunks.push({
        delta: '',
        done: true,
        error: null,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
        metadata: {
          modelUsage: event.modelUsage ?? null,
          numTurns: event.num_turns ?? null,
          stopReason: asString(event.stopReason) ?? null,
          usage: event.usage ?? null,
        },
      });
      return chunks;
    }

    case 'error':
      return [
        {
          delta: '',
          done: true,
          error: asString(event.message) ?? 'grok reported an error',
          kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
        },
      ];

    default:
      return [];
  }
}
