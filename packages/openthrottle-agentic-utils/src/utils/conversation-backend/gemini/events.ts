/**
 * Maps `gemini --output-format stream-json` NDJSON events onto
 * {@link ConversationStreamChunk}s. The rules are the source-verified ones in
 * docs/openthrottle/gemini-stream-json-schema.md §9 (derived from the shipped
 * 0.25.2 emitter, `nonInteractiveCli.js` + `stream-json-formatter.js`).
 *
 * gemini's stream: `init` (session_id + model), `message` (role user/assistant,
 * assistant always `delta: true`, no final echo), single-event `tool_use` with a
 * separate `tool_result` correlated by `tool_id`, non-fatal `error` events, and
 * a terminal `result` that is ALWAYS emitted — success and fatal-error paths
 * alike — carrying `stats` token totals. There are no thinking events in
 * 0.25.2, and the `init.session_id` cannot be resumed (resume is index-based),
 * so no `session` chunk is ever emitted — history is flattened into the prompt.
 *
 * The mapper is a factory: it remembers the `init` model so the terminal usage
 * chunk can attribute tokens to it.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import { CONVERSATION_STREAM_CHUNK_KINDS } from '../types.ts';
import type { ConversationStreamChunk } from '../types.ts';

const asString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

/**
 * Create a stateful mapper for one gemini run. `message`(assistant) → text
 * delta; `tool_use`/`tool_result` → correlated tool chunks; `result` → the
 * terminal usage chunk (error message attached when `status` is `error`);
 * `init`, user echoes, and non-fatal `error` events map to no chunk.
 *
 * @public
 */
export function createGeminiEventMapper(): (
  event: unknown,
) => ConversationStreamChunk[] {
  let model: string | undefined;
  // gemini's `tool_result` events carry only `tool_id` — no name — so the name
  // introduced by the matching `tool_use` has to be remembered for the result.
  const toolNameByCallId = new Map<string, string>();

  return (event: unknown): ConversationStreamChunk[] => {
    if (!isRecord(event)) {
      return [];
    }

    switch (event.type) {
      case 'init': {
        model = asString(event.model) ?? model;
        return [];
      }

      case 'message': {
        if (event.role !== 'assistant') {
          return [];
        }
        return [
          {
            delta: asString(event.content) ?? '',
            done: false,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
          },
        ];
      }

      case 'tool_use': {
        const callId = asString(event.tool_id) ?? '';
        const toolName = asString(event.tool_name) ?? null;

        if (toolName !== null) {
          toolNameByCallId.set(callId, toolName);
        }

        return [
          {
            delta: '',
            done: false,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
            metadata: {
              // `parameters` is already the tool's own flat argument record (verified against
              // gemini-cli-core's shipped `ToolUseEvent`), so it IS the payload — wrapping it
              // beside the name would just repeat what `toolName` carries.
              callId,
              toolCall: event.parameters ?? null,
              toolName,
            },
          },
        ];
      }

      case 'tool_result': {
        const callId = asString(event.tool_id) ?? '';
        return [
          {
            delta: '',
            done: false,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
            metadata: {
              callId,
              toolCall: {
                error: event.error ?? null,
                output: asString(event.output) ?? null,
                status: asString(event.status) ?? null,
              },
              toolName: toolNameByCallId.get(callId) ?? null,
            },
          },
        ];
      }

      case 'result': {
        const failed = event.status === 'error';
        const errorMessage = isRecord(event.error)
          ? asString(event.error.message)
          : undefined;
        return [
          {
            delta: '',
            done: true,
            error: failed ? (errorMessage ?? 'gemini reported an error') : null,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
            metadata: {
              model: model ?? null,
              usage: event.stats ?? null,
            },
          },
        ];
      }

      // Non-fatal `error` events (loop detection, max turns) precede the
      // terminal `result`, which carries the authoritative status — skip them.
      default:
        return [];
    }
  };
}
