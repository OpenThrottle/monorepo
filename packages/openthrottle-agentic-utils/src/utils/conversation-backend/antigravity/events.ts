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
 * agy resumes by id via `--conversation <id>`, so the
 * `init` conversation id IS emitted as a `session` chunk for the composer to reuse.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import type { ConversationStreamChunk } from '../types.ts';
import {
  CONVERSATION_DENIED_ACTIONS_KEY,
  CONVERSATION_STREAM_CHUNK_KINDS,
  CONVERSATION_TOOL_DENIED_ERROR,
  CONVERSATION_TOOL_NOT_RUN_KEY,
} from '../types.ts';

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
 * Labels for `result.denied_actions`, the permissions agy refused in headless mode
 * (`[{ action: 'mcp', display_name: 'McpTool' }]` on 1.5.9): each entry's `display_name`, else its
 * `action`, deduplicated. A denial ends the turn with no answer text, so these are what the chat
 * shows to explain it — see {@link CONVERSATION_DENIED_ACTIONS_KEY}.
 */
const deniedActionsOf = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const labels = new Set<string>();
  for (const entry of value) {
    const label = isRecord(entry)
      ? (asString(entry.display_name) ?? asString(entry.action))
      : asString(entry);
    if (label !== undefined && label.trim() !== '') {
      labels.add(label);
    }
  }

  return [...labels];
};

/** Shown when an ERROR step carries no message of its own. */
const TOOL_STEP_FAILED = 'Tool step failed';

/**
 * The tool's own output, or `null` when `tool_info` reports none. NEVER the arguments: echoing them
 * under RESULT made every card read as if the tool had returned its own input. agy 1.5.9 reports
 * `output` on most DONE steps (a shell transcript, or a summary like `3 lines, 17 bytes` for a
 * read) but omits it on some — a read of a missing file comes back DONE with no output at all.
 */
const toolOutputOf = (toolInfo: unknown): unknown => {
  if (isRecord(toolInfo) && toolInfo.output !== undefined) {
    return toolInfo.output;
  }

  return null;
};

/**
 * An ERROR step's own message. agy 1.5.9 nests it as `tool_info.error: { type, message }`; a bare
 * string, or the same shape on the step itself, is accepted too. Falls back to
 * {@link TOOL_STEP_FAILED}.
 */
const toolErrorOf = (payload: Record<string, unknown>): string => {
  const candidates = [
    isRecord(payload.tool_info) ? payload.tool_info.error : undefined,
    payload.error,
  ];

  for (const candidate of candidates) {
    const message = isRecord(candidate)
      ? asString(candidate.message)
      : asString(candidate);

    if (message !== undefined && message.trim() !== '') {
      return message;
    }
  }

  return TOOL_STEP_FAILED;
};

/**
 * True for agy's own refusal text on an ERROR step, e.g. `permission check failed for mcp "…": user
 * denied permission for mcp(…)` (agy 1.5.13).
 */
const isPermissionDenial = (message: string): boolean => {
  return /permission check failed|user denied permission/i.test(message);
};

/**
 * Create a stateful mapper for one agy run. It remembers the `init` model so the terminal usage
 * chunk can attribute tokens to it, and the tool name per `step_index` so a terminal tool step can
 * report the name that its `ACTIVE` event introduced. It also remembers whether a step was refused
 * permission: agy then cancels the rest of the turn (`CancelCascadeInvocation`), and a step it had
 * batched comes back `DONE` with no output without having run, so such a step is reported not run
 * (see {@link CONVERSATION_TOOL_NOT_RUN_KEY}). A step that reports output did run, and keeps it.
 *
 * @public
 */
export function createAntigravityEventMapper(): (
  event: unknown,
) => ConversationStreamChunk[] {
  let model: string | undefined;
  const toolNameByStep = new Map<number, string>();
  let refusedPermission = false;

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

      // A step-level ERROR is not a turn failure (see rule 3): the card fails, `result.status`
      // decides the turn. The fold marks a card failed only on `isError`, and reads the failure
      // text from `toolCall` — the same contract as the opencode mapper.
      if (state === 'ERROR') {
        const reported = toolErrorOf(payload);
        // agy's own refusal text is long and instructs the model; the card says what happened,
        // in the same words as the ACP path.
        const isDenial = isPermissionDenial(reported);
        if (isDenial) {
          refusedPermission = true;
        }
        const error = isDenial ? CONVERSATION_TOOL_DENIED_ERROR : reported;

        return [
          {
            delta: '',
            done: false,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
            metadata: {
              callId,
              isError: true,
              toolCall: error,
              toolName: name,
            },
          },
        ];
      }

      const output = toolOutputOf(payload.tool_info);
      if (refusedPermission && output === null) {
        return [
          {
            delta: '',
            done: false,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
            metadata: {
              [CONVERSATION_TOOL_NOT_RUN_KEY]: true,
              callId,
              isError: false,
              toolCall: null,
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
            isError: false,
            // The output alone: the card already shows the status, so a `{error, output, status}`
            // wrapper only buried the one field worth reading.
            toolCall: output,
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
      const deniedActions = deniedActionsOf(payload.denied_actions);
      const usageMetadata = {
        model: model ?? null,
        usage: payload.usage ?? null,
      };
      const hasDenials = deniedActions.length > 0;
      const metadata = hasDenials
        ? { ...usageMetadata, [CONVERSATION_DENIED_ACTIONS_KEY]: deniedActions }
        : usageMetadata;

      return [
        {
          delta: '',
          done: true,
          error: failed
            ? (errorMessage ?? 'antigravity reported an error')
            : null,
          kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
          metadata,
        },
      ];
    }

    return [];
  };
}
