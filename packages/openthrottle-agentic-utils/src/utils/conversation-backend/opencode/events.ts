/**
 * Maps opencode `run --format json` NDJSON events onto
 * {@link ConversationStreamChunk}s. Unlike cursor/claude, opencode's mapping is
 * **stateful**: `text` events carry a full per-`part.id` snapshot (not an
 * incremental delta), so the mapper tracks the emitted length per part and emits
 * only the newly-appended suffix — this is opencode's double-count guard. It
 * also surfaces the minted session id (from the first event's top-level
 * `sessionID`) exactly once. The rules are the empirically-verified ones in
 * docs/openthrottle/opencode-stream-json-schema.md §9.
 *
 * There is NO terminal event: opencode signals turn completion by process exit,
 * so the mapper never emits `done:true` — the stream driver does, on close.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import { CONVERSATION_STREAM_CHUNK_KINDS } from '../types.ts';
import type { ConversationStreamChunk } from '../types.ts';

const asString = (value: unknown): string | undefined => {
  const isString = typeof value === 'string';

  return isString ? value : undefined;
};

/** One `text` part snapshot → the suffix beyond what was already emitted for its `part.id`. */
function mapText(
  part: Record<string, unknown>,
  emittedLen: Map<string, number>,
): ConversationStreamChunk | null {
  const id = asString(part.id);
  const full = asString(part.text);
  if (id === undefined || full === undefined) {
    return null;
  }

  const prev = emittedLen.get(id) ?? 0;
  if (full.length <= prev) {
    return null;
  }

  emittedLen.set(id, full.length);

  return {
    delta: full.slice(prev),
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
  };
}

/** A `tool` part → tool_call while running, tool_result once completed/errored. */
function mapTool(
  part: Record<string, unknown>,
): ConversationStreamChunk | null {
  const state = isRecord(part.state) ? part.state : undefined;
  const status = asString(state?.status);
  const callId = asString(part.callID) ?? null;
  const toolName = asString(part.tool) ?? null;
  const metadata = {
    callId,
    tool: toolName,
    toolName,
    toolPart: part,
  };

  if (status === 'completed' || status === 'error') {
    return {
      delta: '',
      done: false,
      error:
        status === 'error' ? (asString(state?.error) ?? 'tool error') : null,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
      metadata,
    };
  }

  return {
    delta: '',
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
    metadata,
  };
}

/** A `step_finish` part → a usage chunk carrying tokens + cost. */
function mapStepFinish(part: Record<string, unknown>): ConversationStreamChunk {
  return {
    delta: '',
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
    metadata: { cost: part.cost ?? null, tokens: part.tokens ?? null },
  };
}

/**
 * A stateful opencode event → chunk mapper. Call {@link OpencodeEventMapper.map}
 * per parsed NDJSON object; it returns zero or more chunks (a first-seen session
 * id yields an extra leading `session` chunk).
 *
 * @public
 */
export interface OpencodeEventMapper {
  map(event: unknown): ConversationStreamChunk[];
}

/**
 * Create a fresh mapper (per stream — it holds per-part emitted-length state).
 *
 * @public
 */
export function createOpencodeEventMapper(): OpencodeEventMapper {
  const emittedLen = new Map<string, number>();
  let sessionEmitted = false;

  return {
    map(event: unknown): ConversationStreamChunk[] {
      if (!isRecord(event)) {
        return [];
      }

      const chunks: ConversationStreamChunk[] = [];

      const sessionId = asString(event.sessionID);
      if (!sessionEmitted && sessionId !== undefined && sessionId !== '') {
        sessionEmitted = true;
        chunks.push({
          delta: '',
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.session,
          metadata: { sessionId },
        });
      }

      const part = isRecord(event.part) ? event.part : undefined;

      if (event.type === 'text' && part !== undefined) {
        const chunk = mapText(part, emittedLen);
        if (chunk !== null) {
          chunks.push(chunk);
        }
      } else if (event.type === 'tool' && part !== undefined) {
        const chunk = mapTool(part);
        if (chunk !== null) {
          chunks.push(chunk);
        }
      } else if (event.type === 'step_finish' && part !== undefined) {
        chunks.push(mapStepFinish(part));
      }

      return chunks;
    },
  };
}
