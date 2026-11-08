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
export function createAcpUpdateMapper(): (
  update: SessionUpdate,
) => ConversationStreamChunk[] {
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
    output: unknown,
  ): ConversationStreamChunk => {
    state.emittedResult = true;
    return {
      delta: '',
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
      metadata: {
        callId,
        toolCall: { output: output ?? null, status },
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
      chunks.push(
        resultChunk(callId, state, status, fields.rawOutput ?? fields.content),
      );
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
 *
 * @public
 */
export function acpTerminalChunk(
  response: PromptResponse,
): ConversationStreamChunk {
  return {
    delta: '',
    done: true,
    error: STOP_REASON_ERRORS[response.stopReason] ?? null,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
    metadata: { stopReason: response.stopReason },
  };
}
