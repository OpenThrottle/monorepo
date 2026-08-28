/**
 * Maps one parsed cursor-agent `stream-json` event onto a
 * {@link ConversationStreamChunk}, or null when the event has no chunk
 * representation (prompt echo, thinking-completed marker, the final
 * full-text assistant echo). The rules are the empirically-verified ones in
 * docs/openthrottle/cursor-agent-stream-json-schema.md §6.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import { CONVERSATION_STREAM_CHUNK_KINDS } from '../types.ts';
import type { ConversationStreamChunk } from '../types.ts';

const asString = (value: unknown): string | undefined => {
  const isString = typeof value === 'string';

  return isString ? value : undefined;
};

/** First text block of a cursor `message.content` array, when present. */
function messageText(message: unknown): string {
  if (!isRecord(message)) {
    return '';
  }

  const content = message.content;
  if (!Array.isArray(content) || !isRecord(content[0])) {
    return '';
  }

  return asString(content[0].text) ?? '';
}

/** `system` → a session-id confirmation chunk on init; otherwise ignored. */
function mapSystem(
  event: Record<string, unknown>,
): ConversationStreamChunk | null {
  if (event.subtype !== 'init') {
    return null;
  }

  return {
    delta: '',
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.session,
    metadata: { sessionId: asString(event.session_id) ?? null },
  };
}

/**
 * `assistant` → a text delta, but ONLY when `timestamp_ms` is present. The
 * trailing consolidated echo (no `timestamp_ms`) repeats the full text and is
 * skipped to avoid double-counting.
 */
function mapAssistant(
  event: Record<string, unknown>,
): ConversationStreamChunk | null {
  if (event.timestamp_ms === undefined) {
    return null;
  }

  return {
    delta: messageText(event.message),
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
  };
}

/** `thinking` → a thinking delta; the `completed` marker carries no text. */
function mapThinking(
  event: Record<string, unknown>,
): ConversationStreamChunk | null {
  if (event.subtype !== 'delta') {
    return null;
  }

  return {
    delta: asString(event.text) ?? '',
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.thinking,
  };
}

/** Keys of a `tool_call` payload that are bookkeeping rather than the tool. */
const TOOL_CALL_RESERVED_KEYS = new Set([
  'hookAdditionalContexts',
  'toolCallId',
]);

/**
 * cursor names its tool with a KEY, not a value: `{ toolCallId, readToolCall:
 * {…} }` means `read`. Pick the first record-valued non-reserved key and strip
 * the `ToolCall` suffix so the client never has to guess.
 */
function toolNameOf(toolCall: unknown): string | null {
  if (!isRecord(toolCall)) {
    return null;
  }

  const key = Object.keys(toolCall).find(
    (candidate) =>
      !TOOL_CALL_RESERVED_KEYS.has(candidate) && isRecord(toolCall[candidate]),
  );

  return key === undefined ? null : key.replace(/ToolCall$/, '');
}

/**
 * `tool_call` → a tool-call chunk on `started`, a tool-result chunk on
 * `completed` (the result is embedded inline in the same event). Correlate the
 * two by `call_id`. The raw `tool_call` payload is passed through as metadata,
 * alongside the canonical `toolName` the client renders.
 */
function mapToolCall(
  event: Record<string, unknown>,
): ConversationStreamChunk | null {
  const callId = asString(event.call_id) ?? null;
  const metadata = {
    callId,
    toolCall: event.tool_call ?? null,
    toolName: toolNameOf(event.tool_call),
  };

  if (event.subtype === 'started') {
    return {
      delta: '',
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
      metadata,
    };
  }

  if (event.subtype === 'completed') {
    return {
      delta: '',
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
      metadata,
    };
  }

  return null;
}

/**
 * `result` → the terminal chunk. Gate the error on `is_error`.
 */
function mapResult(event: Record<string, unknown>): ConversationStreamChunk {
  const isError = event.is_error === true;
  return {
    delta: '',
    done: true,
    error: isError
      ? (asString(event.result) ?? 'cursor-agent reported an error')
      : null,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
    metadata: {
      result: asString(event.result) ?? null,
      usage: event.usage ?? null,
    },
  };
}

/**
 * Map a single cursor-agent event to a chunk, or null to skip it.
 *
 * @public
 */
export function mapCursorEvent(event: unknown): ConversationStreamChunk | null {
  if (!isRecord(event)) {
    return null;
  }

  switch (event.type) {
    case 'assistant':
      return mapAssistant(event);
    case 'result':
      return mapResult(event);
    case 'system':
      return mapSystem(event);
    case 'thinking':
      return mapThinking(event);
    case 'tool_call':
      return mapToolCall(event);

    default:
      return null;
  }
}
