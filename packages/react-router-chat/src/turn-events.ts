/**
 * Canonical folding of a backend conversation stream into the structured
 * {@link ChatTurnEvent} model rendered by {@link ChatTurnTimeline}. Both paths
 * share this one implementation so live streaming and persisted replay converge
 * on identical event shapes:
 *
 * - The live hook folds chunks incrementally with the `apply*`/`append*` helpers.
 * - Persisted replay folds the saved `toolMetadata.events` array in one pass via
 *   {@link foldPersistedTurnEvents}.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import type {
  ChatTurnEvent,
  ChatTurnToolEvent,
  ChatTurnUsageEvent,
  ChatTurnUsageLimitEvent,
} from './types';
import { ChatToolStatus } from './types';
import { hasUsageCounts, normalizeUsage, sumUsage } from './usage';

const asString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null;
};

const safeParse = (
  json: string | null | undefined,
): Record<string, unknown> | null => {
  if (json === null || json === undefined || json === '') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(json);

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * True when a terminal (`done: true`) chunk's metadata carries the server's
 * retryable timeout marker (`TerminalTimeoutMetadata { retryable: true }`) — the
 * turn stalled and was safely interrupted, so the client may auto-retry rather
 * than treat it as a fatal error. Any other terminal (success or fatal failure)
 * returns false.
 * @public
 */
export const isRetryableTerminalMetadata = (
  metadataJson: string | null | undefined,
): boolean => {
  const parsed = safeParse(metadataJson);

  // A usage-limited terminal is never retryable, whatever `retryable` says:
  // replaying the turn would only hammer a limited account.
  return (
    parsed !== null && parsed.retryable === true && !isRecord(parsed.usageLimit)
  );
};

/** Read `{ rateLimitType, resetsAt }` out of an untrusted usage-limit payload. */
const toUsageLimitFields = (
  value: Record<string, unknown> | null,
): Pick<ChatTurnUsageLimitEvent, 'rateLimitType' | 'resetsAt'> => {
  return {
    rateLimitType: asString(value?.rateLimitType),
    resetsAt: asString(value?.resetsAt),
  };
};

/**
 * Fold a usage-limit payload (`{ rateLimitType, resetsAt }`) into the turn's
 * SINGLE `usageLimit` event: a repeat replaces the earlier one in place, since
 * the CLI may report the rejection more than once.
 *
 * @public
 */
export const applyTurnUsageLimit = (
  events: readonly ChatTurnEvent[],
  payload: Record<string, unknown> | null,
  sortOrder: number,
): readonly ChatTurnEvent[] => {
  const existing = events.find((event) => event.kind === 'usageLimit');
  const next: ChatTurnUsageLimitEvent = {
    kind: 'usageLimit',
    ...toUsageLimitFields(payload),
    sortOrder: existing?.sortOrder ?? sortOrder,
  };

  if (existing === undefined) {
    return [...events, next];
  }

  return events.map((event) => (event.kind === 'usageLimit' ? next : event));
};

/**
 * Add a `usageLimit` event for a terminal chunk (or persisted usage payload)
 * whose metadata carries `usageLimit`, unless the turn already has one from a
 * `usage_limit` chunk. Covers a 429 result that arrived with no preceding
 * `rate_limit_event`. A payload without `usageLimit` is a no-op.
 *
 * @public
 */
export const applyTerminalUsageLimit = (
  events: readonly ChatTurnEvent[],
  metadata: Record<string, unknown> | null,
  sortOrder: number,
): readonly ChatTurnEvent[] => {
  const usageLimit = metadata?.usageLimit;

  if (
    !isRecord(usageLimit) ||
    events.some((event) => event.kind === 'usageLimit')
  ) {
    return events;
  }

  return applyTurnUsageLimit(events, usageLimit, sortOrder);
};

/**
 * Parse a chunk's `metadataJson` into a record, or null. Exposed so the stream
 * reducer can hand usage-limit payloads to {@link applyTurnUsageLimit}.
 *
 * @public
 */
export const parseChunkMetadataRecord = (
  metadataJson: string | null | undefined,
): Record<string, unknown> | null => {
  return safeParse(metadataJson);
};

/**
 * Key the server sets to `true` on a persisted event's metadata when it clipped
 * that event's payload to fit the tool_metadata cap. Mirrors
 * `AGENT_CONVERSATION_PAYLOAD_TRUNCATED_KEY` in `@openthrottle/nestjs-repositories`,
 * which this client package cannot import.
 */
const PAYLOAD_TRUNCATED_KEY = 'payloadTruncated';

/** Spread into a tool event: the truncation flag when set, nothing otherwise. */
const payloadTruncatedField = (
  payloadTruncated: boolean,
): Pick<ChatTurnToolEvent, 'payloadTruncated'> => {
  return payloadTruncated ? { payloadTruncated: true } : {};
};

/** Placeholder header used when no backend reported a tool name at all. */
const FALLBACK_TOOL_NAME = 'tool';

/** Keys of a cursor-agent `tool_call` payload that are never the tool itself. */
const LEGACY_TOOL_CALL_RESERVED_KEYS = new Set([
  'hookAdditionalContexts',
  'toolCallId',
]);

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === 'string' && value !== '' ? value : null;
};

/**
 * Legacy key-sniff for cursor-agent's `{ toolCallId, readToolCall: {…} }`, the
 * one shape that names its tool with a KEY rather than a value. Only keys whose
 * value is a record qualify, so a `{ name, parameters }` payload can never
 * resolve to the literal `name`.
 */
const sniffLegacyToolName = (toolCall: unknown): string | null => {
  if (!isRecord(toolCall)) {
    return null;
  }

  const key = Object.keys(toolCall).find(
    (candidate) =>
      !LEGACY_TOOL_CALL_RESERVED_KEYS.has(candidate) &&
      isRecord(toolCall[candidate]),
  );

  return key === undefined ? null : key.replace(/ToolCall$/, '');
};

/**
 * Resolve a chunk's tool name from its whole parsed metadata record, explicit
 * fields first: the canonical `toolName` every backend now emits, then the
 * driver-specific `name`/`tool` fields, then a `toolCall.name` payload, and only
 * as a last resort the legacy cursor-agent key-sniff — which is what keeps
 * conversations persisted before `toolName` existed rendering correctly.
 */
const extractToolName = (
  parsed: Record<string, unknown> | null,
): string | null => {
  if (parsed === null) {
    return null;
  }

  const toolCall = parsed.toolCall;

  return (
    asNonEmptyString(parsed.toolName) ??
    asNonEmptyString(parsed.name) ??
    asNonEmptyString(parsed.tool) ??
    (isRecord(toolCall) ? asNonEmptyString(toolCall.name) : null) ??
    sniffLegacyToolName(toolCall)
  );
};

/**
 * One `tool_result` block of a legacy claude chunk, which carried every result
 * of a `user` event as `toolResults: [...]` instead of one chunk per result.
 */
export interface ParsedToolResultBlock {
  readonly callId: string | null;
  readonly isError: boolean;
  readonly resultJson: string | null;
}

/** Normalized fields the event folders read out of a chunk's metadata. */
export interface ParsedChunkMetadata {
  readonly callId: string | null;
  /**
   * False when the chunk identifies no tool at all — neither a `callId` nor a
   * reported name. Such a chunk is a continuation of the call already open
   * (legacy claude streamed its arguments as `input_json_delta` chunks carrying
   * only `{ index, partialJson }`), not a new call, so the folders must not
   * synthesize a placeholder event from it.
   */
  readonly hasToolIdentity: boolean;
  /** True when a `tool_result` chunk reports a failed call. */
  readonly isError: boolean;
  /** A legacy claude argument fragment, appended to the open call's args. */
  readonly partialJson: string | null;
  /** True when the server clipped this chunk's payload to fit the persisted cap. */
  readonly payloadTruncated: boolean;
  readonly sessionId: string | null;
  /**
   * The `toolCall` payload as display text: a string payload as-is (a tool
   * result is usually text), anything else as JSON.
   */
  readonly toolCallJson: string | null;
  readonly toolName: string;
  /** Legacy claude `toolResults` blocks, each resolved by its own id. */
  readonly toolResultBlocks: readonly ParsedToolResultBlock[];
  readonly usageJson: string | null;
  readonly usageResult: string | null;
}

const EMPTY_METADATA: ParsedChunkMetadata = {
  callId: null,
  hasToolIdentity: false,
  isError: false,
  partialJson: null,
  payloadTruncated: false,
  sessionId: null,
  toolCallJson: null,
  toolName: FALLBACK_TOOL_NAME,
  toolResultBlocks: [],
  usageJson: null,
  usageResult: null,
};

/** A tool payload as display text — strings verbatim, anything else as JSON. */
const toPayloadText = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  return typeof value === 'string' ? value : JSON.stringify(value);
};

/** A value as JSON, or null when it is absent (undefined or null). */
const stringifyOrNull = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
};

/** A legacy `tool_result` block's `content`: text blocks joined, else JSON. */
const toolResultContentText = (content: unknown): string | null => {
  if (!Array.isArray(content)) {
    return toPayloadText(content);
  }

  return content
    .map((part) =>
      isRecord(part) && part.type === 'text' ? (asString(part.text) ?? '') : '',
    )
    .join('\n');
};

const parseToolResultBlocks = (
  value: unknown,
): readonly ParsedToolResultBlock[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((block) => ({
    callId: asString(block.tool_use_id),
    isError: block.is_error === true,
    resultJson: toolResultContentText(block.content),
  }));
};

const normalizeMetadata = (
  parsed: Record<string, unknown> | null,
): ParsedChunkMetadata => {
  if (parsed === null) {
    return EMPTY_METADATA;
  }

  // Legacy claude chunks named the call `toolUseId` rather than `callId`.
  const callId = asString(parsed.callId) ?? asString(parsed.toolUseId);
  const toolName = extractToolName(parsed);

  return {
    callId,
    hasToolIdentity: toolName !== null || callId !== null,
    isError: parsed.isError === true,
    partialJson: asString(parsed.partialJson),
    payloadTruncated: parsed[PAYLOAD_TRUNCATED_KEY] === true,
    sessionId: asString(parsed.sessionId),
    toolCallJson: toPayloadText(parsed.toolCall),
    toolName: toolName ?? FALLBACK_TOOL_NAME,
    toolResultBlocks: parseToolResultBlocks(parsed.toolResults),
    usageJson: stringifyOrNull(parsed.usage),
    usageResult: asString(parsed.result),
  };
};

/**
 * Normalize a chunk's metadata JSON string into the fields the folders need.
 *
 * @public
 */
export const parseChunkMetadata = (
  metadataJson: string | null | undefined,
): ParsedChunkMetadata => {
  return normalizeMetadata(safeParse(metadataJson));
};

/**
 * Best-effort tool name for a one-line activity marker; falls back to 'tool'.
 *
 * @public
 */
export const toolLabelFromMetadataJson = (
  metadataJson: string | null | undefined,
): string => {
  return extractToolName(safeParse(metadataJson)) ?? FALLBACK_TOOL_NAME;
};

/**
 * Append a text/thinking delta, coalescing into a trailing same-kind segment.
 *
 * @public
 */
export const appendTurnTextEvent = (
  events: readonly ChatTurnEvent[],
  kind: 'text' | 'thinking',
  delta: string,
  sortOrder: number,
): readonly ChatTurnEvent[] => {
  if (delta === '') {
    return events;
  }

  const last = events[events.length - 1];
  if (last !== undefined && last.kind === kind) {
    const merged: ChatTurnEvent = { ...last, text: last.text + delta };

    return [...events.slice(0, -1), merged];
  }

  return [...events, { kind, sortOrder, text: delta }];
};

/** Index of the newest still-running tool event, or -1 when none is open. */
const lastRunningToolIndex = (events: readonly ChatTurnEvent[]): number => {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.kind === 'tool' && event.status === 'running') {
      return index;
    }
  }

  return -1;
};

/** Replace the tool event at `index` with `patch` applied; others untouched. */
const patchToolEvent = (
  events: readonly ChatTurnEvent[],
  index: number,
  patch: (event: ChatTurnToolEvent) => ChatTurnToolEvent,
): readonly ChatTurnEvent[] => {
  return events.map((event, i) =>
    i === index && event.kind === 'tool' ? patch(event) : event,
  );
};

/** Index of the tool event with `callId`, or -1 when there is none. */
const findToolIndexByCallId = (
  events: readonly ChatTurnEvent[],
  callId: string | null,
): number => {
  if (callId === null) {
    return -1;
  }

  return events.findIndex((e) => e.kind === 'tool' && e.callId === callId);
};

/**
 * Start a tool event (status running). A repeated callId is the same call, not
 * a new one: when it carries arguments the first chunk lacked (claude opens the
 * card at `content_block_start` and sends the full input on the consolidated
 * `assistant` event) they are filled in; otherwise it is a no-op.
 *
 * @public
 */
export const applyTurnToolCall = (
  events: readonly ChatTurnEvent[],
  meta: ParsedChunkMetadata,
  sortOrder: number,
): readonly ChatTurnEvent[] => {
  const existingIndex = findToolIndexByCallId(events, meta.callId);

  if (existingIndex >= 0) {
    const argsJson = meta.toolCallJson;
    if (argsJson === null) {
      return events;
    }

    return patchToolEvent(events, existingIndex, (event) => ({
      ...event,
      argsJson,
      ...payloadTruncatedField(meta.payloadTruncated),
    }));
  }

  // Legacy claude argument fragments concatenate onto the open call's args;
  // the card shows them raw until the JSON is complete, then pretty-printed.
  const partialJson = meta.partialJson;
  const runningIndex = lastRunningToolIndex(events);
  if (partialJson !== null && !meta.hasToolIdentity && runningIndex >= 0) {
    return patchToolEvent(events, runningIndex, (event) => ({
      ...event,
      argsJson: (event.argsJson ?? '') + partialJson,
    }));
  }

  // Any other identity-less chunk continues the call already open; appending
  // would head a card with the `'tool'` placeholder. With no open call it still
  // becomes one, so a genuinely nameless one-off is never silently swallowed.
  if (!meta.hasToolIdentity && runningIndex >= 0) {
    return events;
  }

  return [
    ...events,
    {
      argsJson: meta.toolCallJson ?? partialJson,
      callId: meta.callId,
      error: null,
      kind: 'tool',
      name: meta.toolName,
      ...payloadTruncatedField(meta.payloadTruncated),
      resultJson: null,
      sortOrder,
      status: 'running',
    },
  ];
};

/** One result to resolve, from a canonical chunk or a legacy block. */
interface ToolResultInput {
  readonly callId: string | null;
  readonly isError: boolean;
  /** An id-less result names a tool, so it must not adopt another's card. */
  readonly namesTool: boolean;
  /** True when the server clipped this result to fit the persisted cap. */
  readonly payloadTruncated: boolean;
  /**
   * Whether an id that matches no call may still resolve the newest open one.
   * True only for legacy claude blocks, whose start chunks may predate ids.
   */
  readonly positionalFallback: boolean;
  readonly resultJson: string | null;
  readonly toolName: string;
}

const resolveToolResult = (
  events: readonly ChatTurnEvent[],
  input: ToolResultInput,
  sortOrder: number,
): readonly ChatTurnEvent[] => {
  const byId = findToolIndexByCallId(events, input.callId);
  const positional =
    input.callId === null ? !input.namesTool : input.positionalFallback;
  const index = byId >= 0 || !positional ? byId : lastRunningToolIndex(events);

  const resolved = {
    error: input.isError ? (input.resultJson ?? 'Tool call failed.') : null,
    ...payloadTruncatedField(input.payloadTruncated),
    resultJson: input.isError ? null : input.resultJson,
    status: input.isError ? ChatToolStatus.failed : ChatToolStatus.succeeded,
  };

  if (index >= 0) {
    return patchToolEvent(events, index, (event) => ({
      ...event,
      ...resolved,
    }));
  }

  // A result with no prior call (out-of-order/edge) — synthesize a completed one.
  return [
    ...events,
    {
      argsJson: null,
      callId: input.callId,
      kind: 'tool',
      name: input.toolName,
      sortOrder,
      ...resolved,
    },
  ];
};

/**
 * Resolve a tool event to succeeded (or failed, when the chunk says `isError`),
 * correlating by callId. An identity-less result (legacy claude's `user` chunk,
 * with its ids on each `toolResults` block) resolves each block by its own id,
 * falling back to the call still open — which both suppresses a placeholder
 * card and unsticks the real call, which would otherwise stay `running`.
 *
 * @public
 */
export const applyTurnToolResult = (
  events: readonly ChatTurnEvent[],
  meta: ParsedChunkMetadata,
  sortOrder: number,
): readonly ChatTurnEvent[] => {
  if (meta.toolResultBlocks.length > 0) {
    return meta.toolResultBlocks.reduce(
      (folded, block) =>
        resolveToolResult(
          folded,
          {
            ...block,
            namesTool: false,
            payloadTruncated: false,
            positionalFallback: true,
            toolName: FALLBACK_TOOL_NAME,
          },
          sortOrder,
        ),
      events,
    );
  }

  return resolveToolResult(
    events,
    {
      callId: meta.callId,
      isError: meta.isError,
      namesTool: meta.hasToolIdentity,
      payloadTruncated: meta.payloadTruncated,
      positionalFallback: false,
      resultJson: meta.toolCallJson,
      toolName: meta.toolName,
    },
    sortOrder,
  );
};

/**
 * Fold a usage chunk (an opencode mid-stream `kind:'usage'` chunk, a claude/
 * cursor terminal usage chunk the server now forwards, or a terminal `done`
 * chunk that still carries usage metadata) into the turn's SINGLE usage event.
 *
 * There is never more than one usage event per turn: token counts accumulate
 * across chunks (opencode reports usage per step, so its per-step counts sum to
 * a turn total), a terminal `error` supersedes, and the event adopts the latest
 * sortOrder so it renders at the end of the timeline. Typed `usage` is populated
 * from the full metadata via {@link normalizeUsage}; the raw {@link
 * ChatTurnUsageEvent.usageJson} is preserved for back-compat. When nothing was
 * reported the `usage` field is left absent (renderers hide the row).
 *
 * @public
 */
export const applyTurnUsage = (
  events: readonly ChatTurnEvent[],
  metadataJson: string | null | undefined,
  sortOrder: number,
  terminal?: { readonly error?: string | null },
): readonly ChatTurnEvent[] => {
  const meta = parseChunkMetadata(metadataJson ?? null);
  const incomingUsage = normalizeUsage(metadataJson ?? null);
  const existing = events.find(
    (event): event is ChatTurnUsageEvent => event.kind === 'usage',
  );

  const mergedUsage = sumUsage(existing?.usage ?? {}, incomingUsage);
  const usageField = hasUsageCounts(mergedUsage) ? mergedUsage : undefined;

  const merged: ChatTurnUsageEvent = {
    error: terminal?.error ?? existing?.error ?? null,
    kind: 'usage',
    result: meta.usageResult ?? existing?.result ?? null,
    sortOrder: Math.max(existing?.sortOrder ?? sortOrder, sortOrder),
    ...(usageField !== undefined ? { usage: usageField } : {}),
    usageJson: meta.usageJson ?? existing?.usageJson ?? null,
  };

  if (existing === undefined) {
    return [...events, merged];
  }

  return events.map((event) => (event.kind === 'usage' ? merged : event));
};

/**
 * Mark any still-running tool events failed when the turn errors out.
 *
 * @public
 */
export const failRunningTurnTools = (
  events: readonly ChatTurnEvent[],
  error: string,
): readonly ChatTurnEvent[] => {
  return events.map((event): ChatTurnEvent => {
    if (event.kind === 'tool' && event.status === 'running') {
      return { ...event, error, status: 'failed' };
    }

    return event;
  });
};

/**
 * Fold a persisted `toolMetadata.events` array (saved non-text events) plus the
 * message body into the same structured timeline a live turn produces.
 *
 * The server persists only non-text events (thinking/tool/session) without a
 * sortOrder, keeps the assistant text in the message body, and never persists
 * the terminal chunk. So replay assigns sortOrder by array index, appends the
 * body as the final text segment, and synthesizes a terminal `usage` marker so
 * the turn reads as complete (no running indicator). Returns `[]` when there
 * are no persisted events, so plain turns keep their flat-body rendering.
 *
 * @public
 */
export const foldPersistedTurnEvents = (
  toolMetadataJson: string | null | undefined,
  bodyText: string,
): readonly ChatTurnEvent[] => {
  const parsed = safeParse(toolMetadataJson);
  const rawEvents =
    parsed !== null && Array.isArray(parsed.events) ? parsed.events : [];

  if (rawEvents.length === 0) {
    return [];
  }

  let events: readonly ChatTurnEvent[] = [];
  let order = 0;
  // Persisted usage events (written by the server since usage stopped being
  // dropped) are collected here and folded AFTER the body so the usage summary
  // renders at the end of the turn — matching live streaming, where the usage
  // event adopts the terminal sortOrder.
  const usageMetadataJsons: Array<string | null> = [];

  for (const raw of rawEvents) {
    if (isRecord(raw)) {
      const kind = asString(raw.kind);
      const delta = asString(raw.delta) ?? '';
      const metadataJson = isRecord(raw.metadata)
        ? JSON.stringify(raw.metadata)
        : null;
      const meta = normalizeMetadata(
        isRecord(raw.metadata) ? raw.metadata : null,
      );

      if (kind === 'thinking') {
        events = appendTurnTextEvent(events, 'thinking', delta, order);
      } else if (kind === 'tool_call') {
        events = applyTurnToolCall(events, meta, order);
      } else if (kind === 'tool_result') {
        events = applyTurnToolResult(events, meta, order);
      } else if (kind === 'session') {
        events = [
          ...events,
          { kind: 'session', sessionId: meta.sessionId, sortOrder: order },
        ];
      } else if (kind === 'usage_limit') {
        events = applyTurnUsageLimit(
          events,
          isRecord(raw.metadata) ? raw.metadata : null,
          order,
        );
      } else if (kind === 'usage') {
        usageMetadataJsons.push(metadataJson);
        // The terminal usage payload of a limited turn carries `usageLimit`;
        // surface it when no `usage_limit` event was persisted (a bare 429).
        events = applyTerminalUsageLimit(
          events,
          isRecord(raw.metadata) ? raw.metadata : null,
          order,
        );
      }
    }

    order += 1;
  }

  if (bodyText.trim() !== '') {
    events = [...events, { kind: 'text', sortOrder: order, text: bodyText }];
    order += 1;
  }

  // Legacy turns (persisted before usage was retained) have no usage events —
  // synthesize an empty terminal usage marker so the turn still reads complete
  // (no running indicator), with no counts. Turns with persisted usage fold it
  // (accumulating across opencode's per-step events) into a single event.
  if (usageMetadataJsons.length === 0) {
    return [
      ...events,
      {
        error: null,
        kind: 'usage',
        result: null,
        sortOrder: order,
        usageJson: null,
      },
    ];
  }

  for (const metadataJson of usageMetadataJsons) {
    events = applyTurnUsage(events, metadataJson, order);
  }

  return events;
};
