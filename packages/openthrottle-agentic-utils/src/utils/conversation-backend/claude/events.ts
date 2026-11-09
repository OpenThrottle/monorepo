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
import {
  isClaudeUsageLimitResult,
  parseClaudeAccountError,
  parseClaudeApiKeySource,
  parseClaudeRateLimitInfo,
} from '@openthrottle/openthrottle-drivers';

import type { ConversationStreamChunk } from '../types.ts';
import { CONVERSATION_STREAM_CHUNK_KINDS } from '../types.ts';

const asString = (value: unknown): string | undefined => {
  const isString = typeof value === 'string';

  return isString ? value : undefined;
};

/**
 * `system` → a session-id confirmation chunk on init; otherwise ignored. It also
 * carries `apiKeySource`, so a failed run can say whether the CLI billed an
 * `ANTHROPIC_API_KEY` from its environment or used the host login.
 */
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
    metadata: {
      apiKeySource: parseClaudeApiKeySource(event),
      sessionId: asString(event.session_id) ?? null,
    },
  };
}

/**
 * The nested Anthropic stream event under `stream_event.event`: incremental
 * text/thinking deltas and tool-use starts. `signature_delta` (a cryptographic
 * signature on thinking blocks) carries no user-visible text → skipped, and so
 * is `input_json_delta`: the complete arguments arrive on the consolidated
 * `assistant` event ({@link mapAssistant}), so the fragments add nothing.
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
          callId: asString(block.id) ?? null,
          index: inner.index ?? null,
          name: asString(block.name) ?? null,
          toolName: asString(block.name) ?? null,
        },
      };
    }
  }

  return null;
}

/**
 * `assistant` (consolidated) → one `tool_call` chunk per `tool_use` block, now
 * carrying the complete `input` as `toolCall`. It repeats the `callId` of the
 * `content_block_start` chunk that opened the card, so the timeline fills in
 * that card's arguments rather than opening a second one. Text and thinking
 * blocks are skipped (double-count). The CLI's synthetic API-error message for
 * a fatal account error maps to one `account_error` chunk instead.
 */
function mapAssistant(
  event: Record<string, unknown>,
): readonly ConversationStreamChunk[] {
  const accountError = parseClaudeAccountError(event);
  if (accountError !== null) {
    return [
      {
        delta: '',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.accountError,
        metadata: { kind: accountError.kind, message: accountError.message },
      },
    ];
  }

  const message = event.message;
  if (!isRecord(message) || !Array.isArray(message.content)) {
    return [];
  }

  return message.content
    .filter(
      (block): block is Record<string, unknown> =>
        isRecord(block) && block.type === 'tool_use',
    )
    .map((block) => ({
      delta: '',
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
      metadata: {
        callId: asString(block.id) ?? null,
        name: asString(block.name) ?? null,
        toolCall: block.input ?? null,
        toolName: asString(block.name) ?? null,
      },
    }));
}

/**
 * A `tool_result` block's `content` as display text: a string as-is, an array
 * of content blocks as its text blocks joined (non-text blocks, e.g. images,
 * become a `[type]` placeholder), anything else verbatim.
 */
function toolResultText(content: unknown): unknown {
  if (!Array.isArray(content)) {
    return content ?? null;
  }

  return content
    .map((part) => {
      if (!isRecord(part)) {
        return '';
      }

      return part.type === 'text'
        ? (asString(part.text) ?? '')
        : `[${asString(part.type) ?? 'content'}]`;
    })
    .join('\n');
}

/**
 * `user` → one `tool_result` chunk per `tool_result` block, correlated to its
 * call by `tool_use_id` (a parallel batch returns several in one event). The
 * result text rides on `toolCall`; `isError` marks a failed call.
 */
function mapUser(
  event: Record<string, unknown>,
): readonly ConversationStreamChunk[] {
  const message = event.message;
  if (!isRecord(message) || !Array.isArray(message.content)) {
    return [];
  }

  return message.content
    .filter(
      (block): block is Record<string, unknown> =>
        isRecord(block) && block.type === 'tool_result',
    )
    .map((block) => ({
      delta: '',
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
      metadata: {
        callId: asString(block.tool_use_id) ?? null,
        isError: block.is_error === true,
        toolCall: toolResultText(block.content),
      },
    }));
}

/**
 * `rate_limit_event` → a `usage_limit` chunk only when `rate_limit_info.status`
 * is `rejected`; `allowed` / `allowed_warning` (and API-key sessions, which omit
 * the info) map to null and surface as keepalives. `resetsAt` is unix epoch
 * seconds on the wire and an ISO-8601 string (or null) in the chunk.
 */
function mapRateLimit(
  event: Record<string, unknown>,
): ConversationStreamChunk | null {
  const usageLimit = parseClaudeRateLimitInfo(event.rate_limit_info);
  if (usageLimit === null) {
    return null;
  }

  return {
    delta: '',
    done: false,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.usageLimit,
    metadata: {
      rateLimitType: usageLimit.rateLimitType,
      resetsAt: usageLimit.resetsAt,
    },
  };
}

/**
 * `result` → the terminal chunk. Gate the error on `is_error`, NOT `subtype`
 * (an invalid model still reports `subtype:"success"`). A 429 error result
 * (`api_error_status`) also sets `metadata.usageLimit` with unknown type/reset;
 * the backend swaps in the details from an earlier `usage_limit` chunk. A fatal
 * account-error result sets `metadata.accountError` (`{ kind, message }`).
 */
function mapResult(event: Record<string, unknown>): ConversationStreamChunk {
  const isError = event.is_error === true;
  const hitUsageLimit = isClaudeUsageLimitResult(event);
  const accountError = parseClaudeAccountError(event);
  const unknownUsageLimit = {
    usageLimit: { rateLimitType: null, resetsAt: null },
  };

  return {
    delta: '',
    done: true,
    error: isError
      ? (asString(event.result) ?? 'claude reported an error')
      : null,
    kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
    metadata: {
      apiErrorStatus: event.api_error_status ?? null,
      modelUsage: event.modelUsage ?? null,
      result: asString(event.result) ?? null,
      totalCostUsd: event.total_cost_usd ?? null,
      usage: event.usage ?? null,
      ...(hitUsageLimit ? unknownUsageLimit : {}),
      ...(accountError === null ? {} : { accountError }),
    },
  };
}

/** A nullable single chunk as the zero-or-one list {@link mapClaudeEvent} returns. */
const listOf = (
  chunk: ConversationStreamChunk | null,
): readonly ConversationStreamChunk[] => {
  return chunk === null ? [] : [chunk];
};

/**
 * Map a single claude event to its chunks — usually zero or one; a `user` event
 * holding a parallel batch's results, or an `assistant` event holding several
 * `tool_use` blocks, yields one per block; a fatal account-error `assistant`
 * event yields one `account_error` chunk. Non-rejected `rate_limit_event`s,
 * non-init `system` subtypes and the consolidated `assistant` text map to none.
 *
 * @public
 */
export function mapClaudeEvent(
  event: unknown,
): readonly ConversationStreamChunk[] {
  if (!isRecord(event)) {
    return [];
  }

  switch (event.type) {
    case 'assistant':
      return mapAssistant(event);
    case 'rate_limit_event':
      return listOf(mapRateLimit(event));
    case 'result':
      return [mapResult(event)];
    case 'stream_event':
      return listOf(mapStreamEvent(event.event));
    case 'system':
      return listOf(mapSystem(event));
    case 'user':
      return mapUser(event);

    default:
      return [];
  }
}
