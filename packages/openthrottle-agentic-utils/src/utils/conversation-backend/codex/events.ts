/**
 * Maps one parsed `codex exec --json` thread event onto a
 * {@link ConversationStreamChunk}, or null when the event has no chunk
 * representation. The event taxonomy is the one verified in
 * docs/openthrottle/codex-stream-json-schema.md §9.
 *
 * codex emits discrete, top-level (dot-namespaced) events — unlike claude's
 * nested `stream_event` envelope. Only `item.completed` items are mapped (each
 * carries the FULL item, e.g. the whole assistant message), so mapping the
 * `item.started`/`item.updated` lifecycle events too would double-count — they
 * are skipped. The terminal chunk is `turn.completed` (usage) or the first
 * `error`/`turn.failed` (whichever the driver sees first).
 *
 * NOTE: the success path (`item.completed` + `turn.completed`) could not be
 * captured live — the host codex credentials were expired during authoring
 * (401 refresh_token_reused) — so the item discriminant is read defensively
 * from `item.item_type ?? item.type` and the text from `item.text`. The failure
 * envelope (`thread.started`/`turn.started`/`error`/`turn.failed`) IS from a
 * real run. See the schema doc.
 */

import { CONVERSATION_STREAM_CHUNK_KINDS } from '../types.ts';
import type { ConversationStreamChunk } from '../types.ts';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  const isObject = typeof value === 'object';

  return isObject && value !== null && !Array.isArray(value);
};

const asString = (value: unknown): string | undefined => {
  const isString = typeof value === 'string';

  return isString ? value : undefined;
};

/** The item discriminant, tolerating either serde spelling. */
const itemType = (item: Record<string, unknown>): string | undefined =>
  asString(item.item_type) ?? asString(item.type);

/**
 * `item.completed` → a chunk for the completed item. `agent_message` → text,
 * `reasoning` → thinking (both carry the full text in `item.text`); every other
 * item kind (`command_execution`, `mcp_tool_call`, `file_change`, `web_search`,
 * `todo_list`, …) → a tool_result carrying the raw item. Unknown/empty items
 * are skipped.
 */
function mapItemCompleted(
  event: Record<string, unknown>,
): ConversationStreamChunk | null {
  const item = event.item;
  if (!isRecord(item)) {
    return null;
  }

  const kind = itemType(item);

  if (kind === 'agent_message') {
    return {
      delta: asString(item.text) ?? '',
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
    };
  }

  if (kind === 'reasoning') {
    return {
      delta: asString(item.text) ?? '',
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.thinking,
    };
  }

  if (kind === undefined) {
    return null;
  }

  return {
    delta: '',
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
    metadata: { item, itemType: kind },
  };
}

/**
 * Map a single codex event to a chunk, or null to skip it.
 *
 * - `thread.started` → a `session` chunk carrying the minted `thread_id`
 *   (surfaced BEFORE any terminal chunk so the service persists it for resume).
 * - `item.completed` → see {@link mapItemCompleted}.
 * - `turn.completed` → the terminal `usage` chunk (`done:true`, no error).
 * - `turn.failed` → the terminal error chunk (`done:true`, `error` message).
 * - `error` → a terminal error chunk (a bare stream error, e.g. auth failure).
 * - everything else (`turn.started`, `item.started`, `item.updated`) → skipped.
 *
 * @public
 */
export function mapCodexEvent(event: unknown): ConversationStreamChunk | null {
  if (!isRecord(event)) {
    return null;
  }

  switch (event.type) {
    case 'thread.started':
      return {
        delta: '',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.session,
        metadata: { sessionId: asString(event.thread_id) ?? null },
      };

    case 'item.completed':
      return mapItemCompleted(event);

    case 'turn.completed':
      return {
        delta: '',
        done: true,
        error: null,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
        metadata: { usage: event.usage ?? null },
      };

    case 'turn.failed': {
      const error = isRecord(event.error) ? event.error : undefined;
      return {
        delta: '',
        done: true,
        error: asString(error?.message) ?? 'codex reported a failed turn',
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
      };
    }

    case 'error':
      return {
        delta: '',
        done: true,
        error: asString(event.message) ?? 'codex reported an error',
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
      };

    default:
      return null;
  }
}
