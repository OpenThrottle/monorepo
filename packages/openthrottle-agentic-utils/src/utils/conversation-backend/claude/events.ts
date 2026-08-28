/**
 * Maps one parsed claude (Claude Code) `stream-json` event onto a
 * {@link ConversationStreamChunk}, or null when the event has no chunk
 * representation. The rules are the empirically-verified ones in
 * docs/openthrottle/claude-stream-json-schema.md §9.
 *
 * The key structural difference from cursor: deltas are **nested** under a
 * `stream_event` envelope that wraps the raw Anthropic Messages API stream
 * (`content_block_delta` etc.), not flat top-level events. The consolidated
 * `assistant` events repeat the full text and are **skipped** (double-count);
 * the envelope type (`stream_event` = delta, `assistant` = consolidated) is the
 * discriminator.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import { CONVERSATION_STREAM_CHUNK_KINDS } from '../types.ts';
import type { ConversationStreamChunk } from '../types.ts';

const asString = (value: unknown): string | undefined => {
  const isString = typeof value === 'string';

  return isString ? value : undefined;
};

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
 * The nested Anthropic stream event under `stream_event.event`: incremental
 * text/thinking deltas and tool-use starts. `signature_delta` (a cryptographic
 * signature on thinking blocks) carries no user-visible text → skipped.
 */
function mapStreamEvent(inner: unknown): ConversationStreamChunk | null {
  if (!isRecord(inner)) {
    return null;
  }

  if (inner.type === 'content_block_delta' && isRecord(inner.delta)) {
    const delta = inner.delta;

    if (delta.type === 'text_delta') {
      return {
        delta: asString(delta.text) ?? '',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
      };
    }

    if (delta.type === 'thinking_delta') {
      return {
        delta: asString(delta.thinking) ?? '',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.thinking,
      };
    }

    if (delta.type === 'input_json_delta') {
      return {
        delta: '',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
        metadata: {
          index: inner.index ?? null,
          partialJson: asString(delta.partial_json) ?? '',
        },
      };
    }

    return null;
  }

  if (inner.type === 'content_block_start' && isRecord(inner.content_block)) {
    const block = inner.content_block;

    if (block.type === 'tool_use') {
      return {
        delta: '',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
        metadata: {
          index: inner.index ?? null,
          name: asString(block.name) ?? null,
          toolName: asString(block.name) ?? null,
          toolUseId: asString(block.id) ?? null,
        },
      };
    }
  }

  return null;
}

/**
 * `user` → tool results returned by claude (correlated by `tool_use_id`). One
 * chunk per `user` event carrying every `tool_result` block it holds.
 */
function mapUser(
  event: Record<string, unknown>,
): ConversationStreamChunk | null {
  const message = event.message;
  if (!isRecord(message) || !Array.isArray(message.content)) {
    return null;
  }

  const toolResults = message.content.filter(
    (block): block is Record<string, unknown> =>
      isRecord(block) && block.type === 'tool_result',
  );

  if (toolResults.length === 0) {
    return null;
  }

  return {
    delta: '',
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
    metadata: { toolResults },
  };
}

/**
 * `result` → the terminal chunk. Gate the error on `is_error`, NOT `subtype`
 * (an invalid model still reports `subtype:"success"`).
 */
function mapResult(event: Record<string, unknown>): ConversationStreamChunk {
  const isError = event.is_error === true;

  return {
    delta: '',
    done: true,
    error: isError
      ? (asString(event.result) ?? 'claude reported an error')
      : null,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
    metadata: {
      modelUsage: event.modelUsage ?? null,
      result: asString(event.result) ?? null,
      totalCostUsd: event.total_cost_usd ?? null,
      usage: event.usage ?? null,
    },
  };
}

/**
 * Map a single claude event to a chunk, or null to skip it. `assistant`
 * (consolidated echo — double-count), `rate_limit_event`, and non-init `system`
 * subtypes have no mapping.
 *
 * @public
 */
export function mapClaudeEvent(event: unknown): ConversationStreamChunk | null {
  if (!isRecord(event)) {
    return null;
  }

  switch (event.type) {
    case 'result':
      return mapResult(event);
    case 'stream_event':
      return mapStreamEvent(event.event);
    case 'system':
      return mapSystem(event);
    case 'user':
      return mapUser(event);

    default:
      return null;
  }
}
