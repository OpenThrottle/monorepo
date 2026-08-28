/**
 * Maps `agy --output-format stream-json` NDJSON events onto
 * {@link ConversationStreamChunk}s. The rules are the ones captured from real runs in
 * docs/openthrottle/antigravity-stream-json-schema.md §3c (Antigravity CLI 1.1.21).
 *
 * agy's stream is deliberately narrow — only THREE event names occur:
 * - `init` — `{model, cwd, tools[], permission_mode}` plus a top-level `conversation_id`.
 * - `step_update` — the workhorse. `{conversation_id, step_index, state, step_type}` always;
 *   `step_type` is `user_input | agent_response | tool` and `state` is `ACTIVE | DONE | ERROR`.
 * - `result` — terminal, with `status`, the complete `response`, and `usage` totals.
 *
 * There are NO separate message/tool_use/tool_result events: tool activity is a `step_update` with
 * `step_type: 'tool'` carrying `tool_name`/`tool_info`.
 *
 * Three captured rules drive this mapper:
 * 1. `text_delta` IS A DELTA, not cumulative — one `step_index` emits several `step_update`s and
 *    each carries only newly produced text, so every delta is forwarded as-is.
 * 2. THE DOUBLE-COUNT RULE — `result.response` is the COMPLETE final assistant text. Emitting the
 *    deltas AND the response duplicates the whole message, so `result` contributes only the
 *    terminal usage chunk and its `response` is never forwarded as text.
 * 3. A step may go `ACTIVE` → `ERROR` and be retried under a NEW `step_index` (observed:
 *    `write_to_file` failing at index 2, succeeding at index 4). A step-level `ERROR` is therefore
 *    NOT a turn failure — only `result.status` is authoritative.
 *
 * Unlike gemini (index-based `--resume`), agy resumes by id via `--conversation <id>`, so the
 * `init` conversation id IS emitted as a `session` chunk for the composer to reuse.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import { CONVERSATION_STREAM_CHUNK_KINDS } from '../types.ts';
import type { ConversationStreamChunk } from '../types.ts';

/** Terminal step states: the step is finished, successfully or not. */
const TERMINAL_STEP_STATES = new Set(['DONE', 'ERROR']);

const asString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

/**
 * `tool_info` is itself `{ name, parameters, output? }` (captured verbatim from agy 1.1.22), so
 * nesting it under a `parameters` key repeats both the tool name and the wrapper. Unwrap to the
 * tool's own arguments; a shape without an inner `parameters` record passes through untouched so no
 * argument key is ever dropped.
 */
const toolArgumentsOf = (toolInfo: unknown): unknown => {
  if (isRecord(toolInfo) && isRecord(toolInfo.parameters)) {
    return toolInfo.parameters;
  }

  return toolInfo ?? null;
};

/**
 * The tool's own output when `tool_info` reports one, else its arguments — an ERROR step often
 * carries no output, and the arguments are more use there than an empty pane.
 */
const toolOutputOf = (toolInfo: unknown): unknown => {
  if (isRecord(toolInfo) && toolInfo.output !== undefined) {
    return toolInfo.output;
  }

  return toolArgumentsOf(toolInfo);
};

/**
 * Create a stateful mapper for one agy run. It remembers the `init` model so the terminal usage
 * chunk can attribute tokens to it, and the tool name per `step_index` so a terminal tool step can
 * report the name that its `ACTIVE` event introduced.
 *
 * @public
 */
export function createAntigravityEventMapper(): (
  event: unknown,
) => ConversationStreamChunk[] {
  let model: string | undefined;
  const toolNameByStep = new Map<number, string>();

  const mapStepUpdate = (
    payload: Record<string, unknown>,
  ): ConversationStreamChunk[] => {
    const stepType = asString(payload.step_type);
    const state = asString(payload.state) ?? '';

    // `user_input` is the echo of our own prompt — it carries no text and no tool.
    if (stepType === 'user_input') {
      return [];
    }

    if (stepType === 'agent_response') {
      const delta = asString(payload.text_delta);

      // Terminal agent_response events often carry usage but no new text; usage is reported once,
      // authoritatively, by `result` — so a textless step contributes nothing.
      if (delta === undefined || delta === '') {
        return [];
      }

      return [
        { delta, done: false, kind: CONVERSATION_STREAM_CHUNK_KINDS.text },
      ];
    }

    if (stepType === 'tool') {
      const stepIndex =
        typeof payload.step_index === 'number' ? payload.step_index : -1;
      const toolName = asString(payload.tool_name);

      if (toolName !== undefined) {
        toolNameByStep.set(stepIndex, toolName);
      }

      const callId = String(stepIndex);
      const name = toolNameByStep.get(stepIndex) ?? null;

      if (!TERMINAL_STEP_STATES.has(state)) {
        return [
          {
            delta: '',
            done: false,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
            metadata: {
              callId,
              toolCall: toolArgumentsOf(payload.tool_info),
              toolName: name,
            },
          },
        ];
      }

      return [
        {
          delta: '',
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
          metadata: {
            callId,
            toolCall: {
              // A step-level ERROR is not a turn failure (see rule 3) — surface it on the tool
              // result and let `result.status` decide the turn.
              error: state === 'ERROR' ? state : null,
              output: toolOutputOf(payload.tool_info),
              status: state,
            },
            toolName: name,
          },
        },
      ];
    }

    return [];
  };

  return (event: unknown): ConversationStreamChunk[] => {
    if (!isRecord(event)) {
      return [];
    }

    const name = asString(event.event);
    const payload = isRecord(event[name ?? '']) ? event[name ?? ''] : undefined;

    if (name === 'init') {
      const init = isRecord(payload) ? payload : {};
      model = asString(init.model) ?? model;

      // `conversation_id` sits at the TOP level on init (not inside the payload).
      const conversationId = asString(event.conversation_id);
      if (conversationId === undefined || conversationId === '') {
        return [];
      }

      return [
        {
          delta: '',
          done: false,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.session,
          metadata: { sessionId: conversationId },
        },
      ];
    }

    if (name === 'step_update' && isRecord(payload)) {
      return mapStepUpdate(payload);
    }

    if (name === 'result' && isRecord(payload)) {
      const failed = asString(payload.status) !== 'SUCCESS';
      const errorMessage = asString(payload.error);

      return [
        {
          delta: '',
          done: true,
          error: failed
            ? (errorMessage ?? 'antigravity reported an error')
            : null,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
          metadata: { model: model ?? null, usage: payload.usage ?? null },
        },
      ];
    }

    return [];
  };
}
