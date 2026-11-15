/**
 * Maps ACP `session/update` notifications onto {@link ConversationStreamChunk}s.
 * The mapping is the one recorded in the plan 6644e9b9 spike:
 *
 * - `agent_message_chunk` → `text`; `agent_thought_chunk` → `thinking`.
 * - `tool_call` + its `tool_call_update`s → ONE `tool_call` chunk and ONE
 *   `tool_result` chunk, correlated by `toolCallId`. An agent may announce a
 *   call with an empty `rawInput` and fill it in a later update (cursor does),
 *   so the `tool_call` chunk is held until the input is known or the call
 *   starts running; the `tool_result` is emitted on `completed`/`failed`.
 *   A `failed` result carries `metadata.isError` and a readable error text
 *   (the update's content text, else a string `rawOutput`, else — for a call
 *   this client refused permission for — a denial message) — the chat
 *   timeline marks a card failed on `isError` alone. A `completed` result
 *   carries the tool's output alone (see {@link completedOutputOf}), never a
 *   `{ output, status }` wrapper and never the call's arguments.
 * - Everything else (`plan`, mode/config/command updates, `session_info_update`,
 *   `usage_update` — a context-window gauge, not token counts — and replayed
 *   `user_message_chunk`s) maps to no chunk.
 *
 * The terminal chunk is built from the `session/prompt` response, not from an
 * update — see {@link acpTerminalChunk}.
 */

import type { PromptResponse, SessionUpdate } from '@agentclientprotocol/sdk';
import { isRecord } from '@openthrottle/nodejs-utils';

import {
  CONVERSATION_DENIED_ACTIONS_KEY,
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationStreamChunk,
  type ConversationStreamChunkKind,
} from '../types.ts';

/** Accumulated state of one tool call across its updates. */
interface ToolCallState {
  emittedCall: boolean;
  emittedResult: boolean;
  rawInput: unknown;
  readonly toolName: string | null;
}

/** True for a `rawInput` worth showing: anything but undefined/null/`{}`. */
function hasInput(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  return !isRecord(value) || Object.keys(value).length > 0;
}

/** The text of a content block, or '' for non-text content. */
function textOf(content: { readonly type: string }): string {
  if ('text' in content && typeof content.text === 'string') {
    return content.text;
  }

  return '';
}

/** Fallback error text for a failed call that carries no readable output. */
const FAILED_TOOL_CALL_ERROR = 'The agent reported a failed tool call.';

/**
 * The joined text of a tool call's `content` array: the text of every
 * `{ type: 'content' }` item, ignoring diffs, terminals and non-text blocks.
 */
function contentTextOf(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }

  const texts: string[] = [];
  for (const item of content) {
    if (isRecord(item) && item.type === 'content' && isRecord(item.content)) {
      const text = item.content.text;
      if (typeof text === 'string' && text !== '') {
        texts.push(text);
      }
    }
  }

  return texts.join('\n');
}

/**
 * Error text for a failed call this client refused permission for. agy 1.5.9
 * reports such a call `failed` with an empty content text and
 * `rawOutput: { output: '' }`, so without this the card reads only as a
 * generic failure.
 */
const DENIED_TOOL_CALL_ERROR = 'Permission denied: the tool call was refused.';

/**
 * Readable error text for a failed call: content text, else a string
 * rawOutput, else the denial message when the call was refused, else a
 * generic message.
 */
function failedErrorText(
  rawOutput: unknown,
  content: unknown,
  denied: boolean,
): string {
  const contentText = contentTextOf(content);
  if (contentText.trim() !== '') {
    return contentText;
  }
  if (typeof rawOutput === 'string' && rawOutput.trim() !== '') {
    return rawOutput;
  }
  if (denied) {
    return DENIED_TOOL_CALL_ERROR;
  }

  return FAILED_TOOL_CALL_ERROR;
}

/**
 * The output of a completed call, or `null` when it reported none: the
 * update's content text, else a string `rawOutput`, else agy's
 * `rawOutput.output` string, else any other non-empty `rawOutput`. agy 1.5.9
 * sends a shell transcript as both content text and `rawOutput.output`, and a
 * file read with neither. The card already shows the status, so the output is
 * never wrapped, and never falls back to the arguments.
 */
function completedOutputOf(rawOutput: unknown, content: unknown): unknown {
  const contentText = contentTextOf(content);
  if (contentText.trim() !== '') {
    return contentText;
  }
  if (typeof rawOutput === 'string') {
    return rawOutput.trim() === '' ? null : rawOutput;
  }
  if (isRecord(rawOutput) && typeof rawOutput.output === 'string') {
    return rawOutput.output.trim() === '' ? null : rawOutput.output;
  }

  return hasInput(rawOutput) ? rawOutput : null;
}

/**
 * Options for {@link createAcpUpdateMapper}.
 *
 * @public
 */
export interface AcpUpdateMapperOptions {
  /**
   * Ids of the tool calls this client refused permission for during the turn.
   * The caller owns the set and adds to it as it answers
   * `session/request_permission`; the mapper only reads it.
   */
  readonly deniedCallIds: ReadonlySet<string>;
}

/** One text-like chunk for a non-empty delta, none otherwise. */
function deltaChunks(
  delta: string,
  kind: ConversationStreamChunkKind,
): ConversationStreamChunk[] {
  if (delta === '') {
    return [];
  }

  return [{ delta, done: false, kind }];
}

/**
 * Create a stateful mapper for one ACP turn.
 *
 * @public
 */
export function createAcpUpdateMapper(
  options: AcpUpdateMapperOptions = { deniedCallIds: new Set() },
): (update: SessionUpdate) => ConversationStreamChunk[] {
  const calls = new Map<string, ToolCallState>();

  const callChunk = (
    callId: string,
    state: ToolCallState,
  ): ConversationStreamChunk => {
    state.emittedCall = true;
    return {
      delta: '',
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
      metadata: {
        callId,
        toolCall: state.rawInput ?? null,
        toolName: state.toolName,
      },
    };
  };

  const resultChunk = (
    callId: string,
    state: ToolCallState,
    status: string,
    fields: { readonly content?: unknown; readonly rawOutput?: unknown },
  ): ConversationStreamChunk => {
    state.emittedResult = true;
    const isError = status === 'failed';
    const denied = options.deniedCallIds.has(callId);
    const errorText = isError
      ? failedErrorText(fields.rawOutput, fields.content, denied)
      : null;

    // The chat timeline marks a card failed only on `metadata.isError`; the
    // chunk-level `error` is read on the terminal `done` chunk alone.
    return {
      delta: '',
      done: false,
      error: errorText,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
      metadata: {
        callId,
        isError,
        toolCall:
          errorText ?? completedOutputOf(fields.rawOutput, fields.content),
        toolName: state.toolName,
      },
    };
  };

  /** Advance one call's state from a `tool_call` or `tool_call_update`. */
  const advance = (
    callId: string,
    fields: {
      readonly content?: unknown;
      readonly rawInput?: unknown;
      readonly rawOutput?: unknown;
      readonly status?: string | null;
      readonly title?: string | null;
    },
  ): ConversationStreamChunk[] => {
    const known = calls.get(callId);
    const state: ToolCallState = known ?? {
      emittedCall: false,
      emittedResult: false,
      rawInput: undefined,
      toolName: fields.title ?? null,
    };
    calls.set(callId, state);

    if (hasInput(fields.rawInput)) {
      state.rawInput = fields.rawInput;
    }

    const chunks: ConversationStreamChunk[] = [];
    const status = fields.status ?? null;
    const finished = status === 'completed' || status === 'failed';
    const started = status === 'in_progress' || finished;

    if (!state.emittedCall && (hasInput(state.rawInput) || started)) {
      chunks.push(callChunk(callId, state));
    }

    if (finished && status !== null && !state.emittedResult) {
      chunks.push(resultChunk(callId, state, status, fields));
    }

    return chunks;
  };

  return (update: SessionUpdate): ConversationStreamChunk[] => {
    switch (update.sessionUpdate) {
      case 'agent_message_chunk': {
        return deltaChunks(
          textOf(update.content),
          CONVERSATION_STREAM_CHUNK_KINDS.text,
        );
      }

      case 'agent_thought_chunk': {
        return deltaChunks(
          textOf(update.content),
          CONVERSATION_STREAM_CHUNK_KINDS.thinking,
        );
      }

      case 'tool_call':
      case 'tool_call_update': {
        return advance(update.toolCallId, update);
      }

      default: {
        return [];
      }
    }
  };
}

/** Error text for a stop reason that did not finish the turn normally. */
const STOP_REASON_ERRORS: Readonly<Record<string, string>> = {
  cancelled: 'cancelled',
  max_tokens: 'The agent stopped: maximum tokens reached.',
  max_turn_requests: 'The agent stopped: maximum turn requests reached.',
  refusal: 'The agent refused to continue.',
};

/**
 * The terminal chunk for a finished `session/prompt`. `end_turn` is a clean
 * finish; every other stop reason is surfaced as the terminal error.
 * `deniedActions` names the calls this client refused during the turn: agy
 * ends such a turn `end_turn` with no answer text, so they ride the terminal
 * metadata under {@link CONVERSATION_DENIED_ACTIONS_KEY} for the chat to
 * explain the silence.
 *
 * @public
 */
export function acpTerminalChunk(
  response: PromptResponse,
  deniedActions: readonly string[] = [],
): ConversationStreamChunk {
  const stopMetadata = { stopReason: response.stopReason };
  const hasDenials = deniedActions.length > 0;
  const metadata = hasDenials
    ? { ...stopMetadata, [CONVERSATION_DENIED_ACTIONS_KEY]: [...deniedActions] }
    : stopMetadata;

  return {
    delta: '',
    done: true,
    error: STOP_REASON_ERRORS[response.stopReason] ?? null,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
    metadata,
  };
}
