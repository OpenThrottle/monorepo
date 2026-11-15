/**
 * Maps `grok --output-format streaming-json` JSONL events onto
 * {@link ConversationStreamChunk}s. The event vocabulary is the one recorded in
 * docs/openthrottle/grok-stream-json-schema.md (grok 1.x; first written against
 * 0.2.112, which surfaced no tool events at all).
 *
 * - `thought` / `text` → thinking / text deltas.
 * - `tool_call` (status `pending`, carrying `rawInput`) → ONE `tool_call` chunk;
 *   its `tool_call_update`s, correlated by `toolCallId`, → ONE `tool_result`
 *   chunk on the terminal `completed` / `failed` update. The earlier `null` and
 *   `in_progress` updates are skipped: a `null` update's `content` is the call's
 *   description, not its output. Parallel calls interleave, so every chunk is
 *   keyed by its own `toolCallId`.
 * - `end` → a `session` chunk (done:false, so `ConversationStreamService`
 *   persists the minted id for resume) then the terminal `usage` chunk. A
 *   `stopReason: 'cancelled'` turn ends WITHOUT a reply — headless grok cancels
 *   the whole turn when a tool needs approval it cannot ask for — so its usage
 *   chunk carries an `error` naming the blocked tool(s) instead of reading as
 *   a normal finish.
 * - `available_commands` (the tool list) and the per-request `usage` event map
 *   to nothing; the terminal `end` carries the turn's totals.
 *
 * The shape is ACP-like, but the ACP mapper is deliberately not reused: it
 * shows `rawOutput` first, and grok's Bash `rawOutput` carries the output as a
 * byte array, while grok's `content` text is the readable result.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import type { ConversationStreamChunk } from '../types.ts';
import { CONVERSATION_STREAM_CHUNK_KINDS } from '../types.ts';

/** grok's failed-call text when a headless run could not ask for approval. */
const CANCELLED_TOOL_PATTERN =
  /^User cancelled the execution for tool `([^`]+)`/;

/** The terminal error for a cancelled turn, naming what was blocked if known. */
function cancelledTurnError(blockedTools: readonly string[]): string {
  if (blockedTools.length === 0) {
    return 'grok cancelled the turn before it finished.';
  }

  const names = blockedTools
    .map((name) => {
      return `\`${name}\``;
    })
    .join(', ');

  return `grok stopped before replying: ${names} needed approval, which a headless run cannot ask for. Choose a more permissive Permissions setting (Full access runs every tool) and send the message again.`;
}

/** What the mapper remembers about one tool call across its updates. */
interface GrokToolCallState {
  finished: boolean;
  readonly toolName: string | null;
}

const asString = (value: unknown): string | undefined => {
  const isString = typeof value === 'string';

  return isString ? value : undefined;
};

/** The joined text of a `tool_call_update`'s `content` blocks, '' for none. */
function contentText(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((block: unknown) => {
      const inner = isRecord(block) ? block.content : undefined;

      return isRecord(inner) ? (asString(inner.text) ?? '') : '';
    })
    .join('');
}

/**
 * The readable result of a finished call: its `content` text, else an MCP
 * call's `rawOutput.output.OkayOutput` (MCP results carry no `content`), else
 * the raw output as-is.
 */
function toolResultOf(event: Record<string, unknown>): unknown {
  const text = contentText(event.content);
  if (text !== '') {
    return text;
  }

  const rawOutput = isRecord(event.rawOutput) ? event.rawOutput : undefined;
  const output = isRecord(rawOutput?.output) ? rawOutput.output : undefined;

  return asString(output?.OkayOutput) ?? event.rawOutput ?? null;
}

/** The `tool_call` chunk that opens a card. */
function toolCallChunk(
  callId: string,
  toolName: string | null,
  input: unknown,
): ConversationStreamChunk {
  return {
    delta: '',
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
    metadata: { callId, toolCall: input ?? null, toolName },
  };
}

/**
 * The `end` event → a `session` chunk (when an id was minted) + terminal usage,
 * which carries an error when grok cancelled the turn.
 */
function endChunks(
  event: Record<string, unknown>,
  blockedTools: readonly string[],
): ConversationStreamChunk[] {
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
  const stopReason = asString(event.stopReason) ?? null;
  const error =
    stopReason === 'cancelled' ? cancelledTurnError(blockedTools) : null;
  chunks.push({
    delta: '',
    done: true,
    error,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
    metadata: {
      modelUsage: event.modelUsage ?? null,
      numTurns: event.num_turns ?? null,
      stopReason,
      usage: event.usage ?? null,
    },
  });

  return chunks;
}

/**
 * A stateful grok event → chunk mapper. Call {@link GrokEventMapper.map} per
 * parsed JSONL object; it returns zero or more chunks.
 *
 * @public
 */
export interface GrokEventMapper {
  map(event: unknown): ConversationStreamChunk[];
}

/**
 * Create a fresh mapper (per stream — it correlates tool calls by
 * `toolCallId`, so it must never be shared between runs).
 *
 * @public
 */
export function createGrokEventMapper(): GrokEventMapper {
  const calls = new Map<string, GrokToolCallState>();
  const blockedTools: string[] = [];

  const openCall = (
    event: Record<string, unknown>,
  ): ConversationStreamChunk[] => {
    const callId = asString(event.toolCallId);
    if (callId === undefined || calls.has(callId)) {
      return [];
    }

    const toolName = asString(event.toolName) ?? asString(event.title) ?? null;
    calls.set(callId, { finished: false, toolName });

    return [toolCallChunk(callId, toolName, event.rawInput)];
  };

  const updateCall = (
    event: Record<string, unknown>,
  ): ConversationStreamChunk[] => {
    const callId = asString(event.toolCallId);
    const status = asString(event.status);
    const isTerminal = status === 'completed' || status === 'failed';
    if (callId === undefined || !isTerminal) {
      return [];
    }

    const chunks: ConversationStreamChunk[] = [];
    let state = calls.get(callId);
    if (state === undefined) {
      // An update for a call never announced still gets a card to land on.
      state = { finished: false, toolName: null };
      calls.set(callId, state);
      chunks.push(toolCallChunk(callId, null, null));
    }
    if (state.finished) {
      return [];
    }
    state.finished = true;

    const isError = status === 'failed';
    const result = toolResultOf(event);
    const blocked = CANCELLED_TOOL_PATTERN.exec(asString(result) ?? '')?.[1];
    if (isError && blocked !== undefined && !blockedTools.includes(blocked)) {
      blockedTools.push(blocked);
    }
    const errorText = isError
      ? (asString(result) ?? 'grok reported a failed tool call')
      : null;

    // The chat timeline marks a card failed only on `metadata.isError`; the
    // chunk-level `error` is read on the terminal `done` chunk alone.
    chunks.push({
      delta: '',
      done: false,
      error: errorText,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
      metadata: {
        callId,
        isError,
        toolCall: errorText ?? result,
        toolName: state.toolName,
      },
    });

    return chunks;
  };

  return {
    map(event: unknown): ConversationStreamChunk[] {
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

        case 'tool_call':
          return openCall(event);

        case 'tool_call_update':
          return updateCall(event);

        case 'end':
          return endChunks(event, blockedTools);

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
    },
  };
}
