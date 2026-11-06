/**
 * Maps opencode `run --format json` NDJSON events onto
 * {@link ConversationStreamChunk}s. Unlike cursor/claude, opencode's mapping is
 * **stateful**: `text` events carry a full per-`part.id` snapshot (not an
 * incremental delta), so the mapper tracks the emitted length per part and emits
 * only the newly-appended suffix — this is opencode's double-count guard. It
 * also surfaces the minted session id (from the first event's top-level
 * `sessionID`) exactly once. A real opencode 1.18.16 stream is captured in
 * `__tests__/opencode-1-18-tool-use.fixture.ts`.
 *
 * There is NO terminal event: opencode signals turn completion by process exit,
 * so the mapper never emits `done:true` — the stream driver does, on close.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import type { ConversationStreamChunk } from '../types.ts';
import { CONVERSATION_STREAM_CHUNK_KINDS } from '../types.ts';

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

/**
 * Event types that carry a tool part. opencode 1.18 names them `tool_use`;
 * earlier builds used `tool`, which stays accepted for replaying old streams.
 */
const TOOL_EVENT_TYPES: ReadonlySet<unknown> = new Set(['tool', 'tool_use']);

/**
 * A tool part → a tool_call chunk carrying the call's input, then a tool_result
 * chunk once the part is completed/errored, carrying its output (or error text).
 *
 * @description opencode 1.18 emits ONE `tool_use` per call, already terminal,
 * with no running event before it. The chat timeline only learns a call's
 * arguments from a tool_call chunk, so the first sighting of a call id that is
 * already terminal emits both chunks — otherwise the card would have a result
 * but no arguments.
 */
function mapTool(
  part: Record<string, unknown>,
  startedCallIds: Set<string>,
): ConversationStreamChunk[] {
  const state = isRecord(part.state) ? part.state : undefined;
  const status = asString(state?.status);
  const callId = asString(part.callID) ?? null;
  const toolName = asString(part.tool) ?? null;
  // The raw part is deliberately NOT forwarded: it holds the output twice
  // (state.output and state.metadata.output) on top of the `toolCall` copy, and
  // the persisted turn is capped at 64 KB — one large read pushed a whole turn
  // over it and every tool card was lost on reload.
  const metadata = {
    callId,
    tool: toolName,
    toolName,
  };
  const isTerminal = status === 'completed' || status === 'error';
  const isStarted = callId !== null && startedCallIds.has(callId);

  const chunks: ConversationStreamChunk[] = [];

  if (!isTerminal || !isStarted) {
    if (callId !== null) {
      startedCallIds.add(callId);
    }

    chunks.push({
      delta: '',
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
      metadata: { ...metadata, toolCall: state?.input ?? null },
    });
  }

  if (isTerminal) {
    const isError = status === 'error';
    const errorText = isError ? (asString(state?.error) ?? 'tool error') : null;

    // The chat timeline marks a card failed only on `metadata.isError`; the
    // chunk-level `error` is read on the terminal `done` chunk alone.
    chunks.push({
      delta: '',
      done: false,
      error: errorText,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
      metadata: {
        ...metadata,
        isError,
        toolCall: errorText ?? state?.output ?? null,
      },
    });
  }

  return chunks;
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
  const startedCallIds = new Set<string>();
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
      } else if (TOOL_EVENT_TYPES.has(event.type) && part !== undefined) {
        chunks.push(...mapTool(part, startedCallIds));
      } else if (event.type === 'step_finish' && part !== undefined) {
        chunks.push(mapStepFinish(part));
      }

      return chunks;
    },
  };
}
