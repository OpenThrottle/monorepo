/**
 * Maps one parsed `codex exec --json` thread event onto a
 * {@link ConversationStreamChunk}, or null when the event has no chunk
 * representation. The event taxonomy is the one verified in
 * docs/openthrottle/codex-stream-json-schema.md §9.
 *
 * codex emits discrete, top-level (dot-namespaced) events — unlike claude's
 * nested `stream_event` envelope. Text items (`agent_message`, `reasoning`) map
 * from `item.completed` only (it carries the FULL text; the lifecycle events
 * would double-count). Tool items map from `item.started` (opens the card) and
 * `item.completed` (resolves it) — see {@link createCodexEventMapper}. The
 * terminal chunk is `turn.completed` (usage) or the first `error`/`turn.failed`
 * (whichever the driver sees first).
 *
 * NOTE: the success path (`item.completed` + `turn.completed`) could not be
 * captured live — the host codex credentials were expired during authoring
 * (401 refresh_token_reused) — so the item discriminant is read defensively
 * from `item.item_type ?? item.type` and the text from `item.text`. The failure
 * envelope (`thread.started`/`turn.started`/`error`/`turn.failed`) IS from a
 * real run. See the schema doc.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import type { ConversationStreamChunk } from '../types.ts';
import { CONVERSATION_STREAM_CHUNK_KINDS } from '../types.ts';
import { readCodexToolItem } from './tool-items.ts';

const asString = (value: unknown): string | undefined => {
  const isString = typeof value === 'string';

  return isString ? value : undefined;
};

/** The item discriminant, tolerating either serde spelling. */
const itemType = (item: Record<string, unknown>): string | undefined => {
  return asString(item.item_type) ?? asString(item.type);
};

/** Item kinds that carry assistant prose rather than a tool activity. */
const TEXT_ITEM_KINDS = new Set(['agent_message', 'reasoning']);

/**
 * The `tool_call` chunk that opens (or, on a repeat id, fills in) a codex
 * item's card. codex has no tool name of its own — the item kind
 * (`command_execution`, `file_change`, …) IS what the activity was, so it
 * doubles as the name.
 */
function toolCallChunk(
  callId: string | null,
  kind: string,
  args: unknown,
): ConversationStreamChunk {
  return {
    delta: '',
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
    metadata: { callId, itemType: kind, toolCall: args, toolName: kind },
  };
}

/**
 * `item.completed` for a text item → text/thinking (the full text is in
 * `item.text`).
 */
function mapTextItem(
  kind: string,
  item: Record<string, unknown>,
): ConversationStreamChunk {
  const isReasoning = kind === 'reasoning';

  return {
    delta: asString(item.text) ?? '',
    done: false,
    kind: isReasoning
      ? CONVERSATION_STREAM_CHUNK_KINDS.thinking
      : CONVERSATION_STREAM_CHUNK_KINDS.text,
  };
}

/**
 * A stateful codex event → chunk mapper. Call {@link CodexEventMapper.map} per
 * parsed JSONL object; it returns zero or more chunks.
 *
 * @public
 */
export interface CodexEventMapper {
  map(event: unknown): ConversationStreamChunk[];
}

/**
 * Create a fresh mapper (per stream — it remembers which item ids already
 * opened a card).
 *
 * Tool items map the way the shared chat fold reads every other backend: a
 * `tool_call` chunk (`callId` + `toolCall` = the arguments) opens the card and
 * a `tool_result` chunk (`callId` + `toolCall` = the result, `isError`)
 * resolves it. `item.started` opens it while the command runs; an item that
 * arrives only as `item.completed` gets both chunks at once, so a card never
 * has a result but no arguments. The item id is the `callId`, keeping parallel
 * items on their own card. The raw item is not forwarded: it repeats the output
 * the result already carries, and the persisted turn is capped.
 *
 * @public
 */
export function createCodexEventMapper(): CodexEventMapper {
  const startedCallIds = new Set<string>();

  const mapToolItem = (
    eventType: string,
    kind: string,
    item: Record<string, unknown>,
  ): ConversationStreamChunk[] => {
    const callId = asString(item.id) ?? null;
    const read = readCodexToolItem(kind, item);
    const isStarted = callId !== null && startedCallIds.has(callId);

    if (eventType === 'item.started') {
      if (isStarted) {
        return [];
      }
      if (callId !== null) {
        startedCallIds.add(callId);
      }

      return [toolCallChunk(callId, kind, read.args)];
    }

    // An id-less result cannot be paired with its call, so it stands alone.
    const needsOpening = !isStarted && callId !== null;
    const opening = needsOpening
      ? [toolCallChunk(callId, kind, read.args)]
      : [];

    return [
      ...opening,
      {
        delta: '',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
        metadata: {
          callId,
          isError: read.isError,
          itemType: kind,
          toolCall: read.result,
          toolName: kind,
        },
      },
    ];
  };

  const mapItem = (
    event: Record<string, unknown>,
  ): ConversationStreamChunk[] => {
    const item = event.item;
    const eventType = asString(event.type) ?? '';
    const kind = isRecord(item) ? itemType(item) : undefined;

    if (!isRecord(item) || kind === undefined) {
      return [];
    }

    if (TEXT_ITEM_KINDS.has(kind)) {
      // Only the completed item carries the full text; mapping its lifecycle
      // events too would double-count it.
      return eventType === 'item.completed' ? [mapTextItem(kind, item)] : [];
    }

    return mapToolItem(eventType, kind, item);
  };

  return {
    map(event: unknown): ConversationStreamChunk[] {
      if (!isRecord(event)) {
        return [];
      }

      if (event.type === 'item.started' || event.type === 'item.completed') {
        return mapItem(event);
      }

      const chunk = mapTurnEvent(event);

      return chunk === null ? [] : [chunk];
    },
  };
}

/**
 * Map a single non-item codex event to a chunk, or null to skip it. Items
 * (`item.started`/`item.completed`) need per-stream state and go through
 * {@link createCodexEventMapper}.
 *
 * - `thread.started` → a `session` chunk carrying the minted `thread_id`
 *   (surfaced BEFORE any terminal chunk so the service persists it for resume).
 * - `turn.completed` → the terminal `usage` chunk (`done:true`, no error).
 * - `turn.failed` → the terminal error chunk (`done:true`, `error` message).
 * - `error` → a terminal error chunk (a bare stream error, e.g. auth failure).
 * - everything else (`turn.started`, `item.*`) → skipped.
 */
function mapTurnEvent(event: unknown): ConversationStreamChunk | null {
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
