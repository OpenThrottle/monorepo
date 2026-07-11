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

import type { ChatTurnEvent } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

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

/** Best-effort tool name from a parsed `toolCall` payload; falls back to 'tool'. */
const extractToolName = (toolCall: unknown): string => {
  if (!isRecord(toolCall)) {
    return 'tool';
  }

  const name = Object.keys(toolCall).find(
    (key) => key !== 'toolCallId' && key !== 'hookAdditionalContexts',
  );

  return name === undefined ? 'tool' : name.replace(/ToolCall$/, '');
};

/** Normalized fields the event folders read out of a chunk's metadata. */
export interface ParsedChunkMetadata {
  readonly callId: string | null;
  readonly sessionId: string | null;
  readonly toolCallJson: string | null;
  readonly toolName: string;
  readonly usageJson: string | null;
  readonly usageResult: string | null;
}

const EMPTY_METADATA: ParsedChunkMetadata = {
  callId: null,
  sessionId: null,
  toolCallJson: null,
  toolName: 'tool',
  usageJson: null,
  usageResult: null,
};

const normalizeMetadata = (
  parsed: Record<string, unknown> | null,
): ParsedChunkMetadata => {
  if (parsed === null) {
    return EMPTY_METADATA;
  }

  const toolCall = parsed.toolCall;

  return {
    callId: asString(parsed.callId),
    sessionId: asString(parsed.sessionId),
    toolCallJson:
      toolCall === undefined || toolCall === null
        ? null
        : JSON.stringify(toolCall),
    toolName: extractToolName(toolCall),
    usageJson:
      parsed.usage === undefined || parsed.usage === null
        ? null
        : JSON.stringify(parsed.usage),
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
): ParsedChunkMetadata => normalizeMetadata(safeParse(metadataJson));

/**
 * Best-effort tool name for a one-line activity marker; falls back to 'tool'.
 *
 * @public
 */
export const toolLabelFromMetadataJson = (
  metadataJson: string | null | undefined,
): string => {
  const parsed = safeParse(metadataJson);

  if (parsed === null || !isRecord(parsed.toolCall)) {
    return 'tool';
  }

  return extractToolName(parsed.toolCall);
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

/**
 * Start a tool event (status running); idempotent on a repeated callId.
 *
 * @public
 */
export const applyTurnToolCall = (
  events: readonly ChatTurnEvent[],
  meta: ParsedChunkMetadata,
  sortOrder: number,
): readonly ChatTurnEvent[] => {
  const exists =
    meta.callId !== null &&
    events.some((e) => e.kind === 'tool' && e.callId === meta.callId);
  if (exists) {
    return events;
  }

  return [
    ...events,
    {
      argsJson: meta.toolCallJson,
      callId: meta.callId,
      error: null,
      kind: 'tool',
      name: meta.toolName,
      resultJson: null,
      sortOrder,
      status: 'running',
    },
  ];
};

/**
 * Resolve a tool event to succeeded, correlating by callId.
 *
 * @public
 */
export const applyTurnToolResult = (
  events: readonly ChatTurnEvent[],
  meta: ParsedChunkMetadata,
  sortOrder: number,
): readonly ChatTurnEvent[] => {
  const index =
    meta.callId === null
      ? -1
      : events.findIndex((e) => e.kind === 'tool' && e.callId === meta.callId);

  if (index >= 0) {
    const existing = events[index];

    return events.map((event, i) =>
      i === index
        ? { ...existing, resultJson: meta.toolCallJson, status: 'succeeded' }
        : event,
    );
  }

  // A result with no prior call (out-of-order/edge) — synthesize a completed one.
  return [
    ...events,
    {
      argsJson: null,
      callId: meta.callId,
      error: null,
      kind: 'tool',
      name: meta.toolName,
      resultJson: meta.toolCallJson,
      sortOrder,
      status: 'succeeded',
    },
  ];
};

/**
 * Mark any still-running tool events failed when the turn errors out.
 *
 * @public
 */
export const failRunningTurnTools = (
  events: readonly ChatTurnEvent[],
  error: string,
): readonly ChatTurnEvent[] =>
  events.map((event) =>
    event.kind === 'tool' && event.status === 'running'
      ? { ...event, error, status: 'failed' }
      : event,
  );

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

  for (const raw of rawEvents) {
    if (isRecord(raw)) {
      const kind = asString(raw.kind);
      const delta = asString(raw.delta) ?? '';
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
      }
    }

    order += 1;
  }

  if (bodyText.trim() !== '') {
    events = [...events, { kind: 'text', sortOrder: order, text: bodyText }];
    order += 1;
  }

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
};
