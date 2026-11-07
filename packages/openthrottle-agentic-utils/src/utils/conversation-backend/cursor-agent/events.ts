/**
 * Maps one parsed cursor-agent `stream-json` event onto a
 * {@link ConversationStreamChunk}, or null when the event has no chunk
 * representation (prompt echo, thinking-completed marker, the final
 * full-text assistant echo). The rules are the empirically-verified ones in
 * docs/openthrottle/cursor-agent-stream-json-schema.md §6.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import type { ConversationStreamChunk } from '../types.ts';
import { CONVERSATION_STREAM_CHUNK_KINDS } from '../types.ts';

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
 * `assistant` → a text delta, but ONLY for a streamed partial: it carries
 * `timestamp_ms` and no `model_call_id`. cursor consolidates text twice, and
 * both repeat deltas already sent, so both are skipped:
 *
 * - before each tool call, the segment so far, WITH `timestamp_ms` and a
 *   `model_call_id` (emitting it doubled every interim sentence);
 * - at the end, the final segment again, with no `timestamp_ms`.
 */
function mapAssistant(
  event: Record<string, unknown>,
): ConversationStreamChunk | null {
  if (event.timestamp_ms === undefined || event.model_call_id !== undefined) {
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
function toolKeyOf(toolCall: unknown): string | null {
  if (!isRecord(toolCall)) {
    return null;
  }

  const key = Object.keys(toolCall).find(
    (candidate) =>
      !TOOL_CALL_RESERVED_KEYS.has(candidate) && isRecord(toolCall[candidate]),
  );

  return key ?? null;
}

function toolNameOf(toolCall: unknown): string | null {
  const key = toolKeyOf(toolCall);

  return key === null ? null : key.replace(/ToolCall$/, '');
}

/** The `<kind>ToolCall` record itself (`{ args, result? }`), when present. */
function toolPayloadOf(toolCall: unknown): Record<string, unknown> | null {
  const key = toolKeyOf(toolCall);
  if (key === null || !isRecord(toolCall)) {
    return null;
  }

  const payload = toolCall[key];

  return isRecord(payload) ? payload : null;
}

/** Shown when cursor rejects a call without saying why (the common case). */
const REJECTED_WITHOUT_REASON = 'Rejected by cursor permissions';

const asNonEmptyString = (value: unknown): string | undefined => {
  const text = asString(value);

  return text === undefined || text.trim() === '' ? undefined : text;
};

/**
 * The readable failure of a completed tool call, or null when it succeeded.
 * cursor reports a per-call outcome as exactly one of `result.success`,
 * `result.error` (`{ errorMessage }`) or `result.rejected` (`{ reason }`, the
 * reason usually empty when its permission policy said no).
 */
function toolFailureOf(payload: Record<string, unknown> | null): string | null {
  const result = payload?.result;
  if (!isRecord(result)) {
    return null;
  }

  if (isRecord(result.error)) {
    return (
      asNonEmptyString(result.error.errorMessage) ??
      asNonEmptyString(result.error.message) ??
      'Tool call failed'
    );
  }

  if (isRecord(result.rejected)) {
    return asNonEmptyString(result.rejected.reason) ?? REJECTED_WITHOUT_REASON;
  }

  return null;
}

/**
 * Keys cursor adds to a tool's `args` for its own bookkeeping — ids, the
 * shell parser's working, approval flags. None of it is what the model asked
 * for, so the card's ARGUMENTS leaves it out.
 */
const TOOL_ARGS_INTERNAL_KEYS = new Set([
  'adminCommandDenylist',
  'argumentsRepaired',
  'closeStdin',
  'conversationId',
  'fileOutputThresholdBytes',
  'hardTimeout',
  'hasInputRedirect',
  'hasOutputRedirect',
  'parsingResult',
  'requestId',
  'simpleCommands',
  'skipApproval',
  'smartModeApprovalOnly',
  'smartModeClassifierAllowed',
  'symbolicPathArguments',
  'timeoutBehavior',
  'toolCallId',
]);

/** The model-facing arguments of a tool call: `args` minus cursor's own keys. */
function toolArgsOf(payload: Record<string, unknown>): unknown {
  const args = payload.args;
  if (!isRecord(args)) {
    return args ?? null;
  }

  return Object.fromEntries(
    Object.entries(args).filter(([key]) => !TOOL_ARGS_INTERNAL_KEYS.has(key)),
  );
}

/**
 * The output of a successful call: a lone string `content` (mcp,
 * getMcpTools) as text, any other `success` record as-is.
 */
function toolSuccessOf(payload: Record<string, unknown>): unknown {
  const result = payload.result;
  const success = isRecord(result) ? result.success : undefined;
  if (!isRecord(success)) {
    return success ?? null;
  }

  return asString(success.content) ?? success;
}

/**
 * `tool_call` → a tool-call chunk on `started`, a tool-result chunk on
 * `completed` (the result is embedded inline in the same event). Correlate the
 * two by `call_id`. `toolCall` carries what the card shows: the tool's args on
 * `started`; its outcome on `completed` — the success output, or the failure
 * text with `isError`. An envelope with no recognizable tool key passes
 * through whole rather than rendering nothing.
 */
function mapToolCall(
  event: Record<string, unknown>,
): ConversationStreamChunk | null {
  const callId = asString(event.call_id) ?? null;
  const toolName = toolNameOf(event.tool_call);
  const payload = toolPayloadOf(event.tool_call);
  const envelope = event.tool_call ?? null;

  if (event.subtype === 'started') {
    const toolCall = payload === null ? envelope : toolArgsOf(payload);

    return {
      delta: '',
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
      metadata: { callId, toolCall, toolName },
    };
  }

  if (event.subtype !== 'completed') {
    return null;
  }

  const failure = toolFailureOf(payload);
  const success = payload === null ? envelope : toolSuccessOf(payload);
  // The shared fold reads a failed result's text from `toolCall` too.
  const failedMetadata = { callId, isError: true, toolCall: failure, toolName };
  const succeededMetadata = { callId, toolCall: success, toolName };

  return {
    delta: '',
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
    metadata: failure === null ? succeededMetadata : failedMetadata,
  };
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
