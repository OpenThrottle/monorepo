import { isRecord } from '@openthrottle/nodejs-utils';

import {
  AGENT_CONVERSATION_CONTENT_MAX_BYTES,
  AGENT_CONVERSATION_LIST_DEFAULT_LIMIT,
  AGENT_CONVERSATION_LIST_MAX_LIMIT,
  AGENT_CONVERSATION_MESSAGES_DEFAULT_LIMIT,
  AGENT_CONVERSATION_MESSAGES_MAX_LIMIT,
  AGENT_CONVERSATION_PAYLOAD_TRUNCATED_KEY,
  AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES,
} from './agent-conversations.constants.ts';

/** Marks UTF-8 continuation bytes (0b10xxxxxx) when backing off to a code-point boundary. */
const UTF8_CONTINUATION_MASK = 0b1100_0000;
const UTF8_CONTINUATION_VALUE = 0b1000_0000;

const truncateUtf8 = (
  value: string,
  maxBytes: number,
): { readonly truncated: boolean; readonly value: string } => {
  const buffer = Buffer.from(value, 'utf8');
  if (buffer.byteLength <= maxBytes) {
    return { truncated: false, value };
  }

  // Cut on the byte side (O(n)) — shrinking the string one char at a time
  // re-encodes the whole prefix per step and goes quadratic on large inputs.
  let end = maxBytes;
  while (
    end > 0 &&
    ((buffer[end] ?? 0) & UTF8_CONTINUATION_MASK) === UTF8_CONTINUATION_VALUE
  ) {
    end -= 1;
  }

  return { truncated: true, value: buffer.subarray(0, end).toString('utf8') };
};

/**
 * @description Derives a conversation title from the first user message (~80 chars).
 */
export const deriveConversationTitleFromMessage = (content: string): string => {
  const trimmed = content.trim();
  if (trimmed.length <= 80) {
    return trimmed;
  }

  return `${trimmed.slice(0, 80).trimEnd()}…`;
};

/**
 * @description Caps message content to the app-level UTF-8 byte limit.
 */
export const capAgentConversationContent = (
  content: string,
): { readonly content: string; readonly contentTruncated: boolean } => {
  const { truncated, value } = truncateUtf8(
    content,
    AGENT_CONVERSATION_CONTENT_MAX_BYTES,
  );

  return { content: value, contentTruncated: truncated };
};

/** Event-level keys whose value is a payload that may be clipped. */
const CLIPPABLE_EVENT_KEYS: readonly string[] = ['delta'];

/** `metadata` keys whose value is a payload that may be clipped. */
const CLIPPABLE_METADATA_KEYS: readonly string[] = [
  'partialJson',
  'result',
  'toolCall',
];

interface ClippedValue {
  readonly clipped: boolean;
  readonly value: unknown;
}

interface ClippedRecord {
  readonly clipped: boolean;
  readonly value: Record<string, unknown>;
}

const utf8ByteLength = (value: string): number => {
  return Buffer.byteLength(value, 'utf8');
};

/** A payload as text: strings verbatim, records/arrays as JSON, else null. */
const payloadText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }

  if (isRecord(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return null;
};

/** Clip one payload to `limit` bytes; an object payload becomes its clipped JSON text. */
const clipPayload = (value: unknown, limit: number): ClippedValue => {
  const text = payloadText(value);
  if (text === null) {
    return { clipped: false, value };
  }

  const result = truncateUtf8(text, limit);
  if (!result.truncated) {
    return { clipped: false, value };
  }

  return { clipped: true, value: result.value };
};

/** Clip the listed keys of `record` to `limit` bytes each, leaving every other key intact. */
const clipKeys = (
  record: Record<string, unknown>,
  keys: readonly string[],
  limit: number,
): ClippedRecord => {
  const value: Record<string, unknown> = { ...record };
  let clipped = false;

  for (const key of keys) {
    if (key in record) {
      const result = clipPayload(record[key], limit);
      clipped = clipped || result.clipped;
      value[key] = result.value;
    }
  }

  return { clipped, value };
};

/** Clip one persisted event's payloads, flagging its metadata when anything was cut. */
const clipEvent = (event: unknown, limit: number): unknown => {
  if (!isRecord(event)) {
    return event;
  }

  const outer = clipKeys(event, CLIPPABLE_EVENT_KEYS, limit);
  const inner = clipKeys(
    isRecord(event.metadata) ? event.metadata : {},
    CLIPPABLE_METADATA_KEYS,
    limit,
  );

  if (!outer.clipped && !inner.clipped) {
    return event;
  }

  return {
    ...outer.value,
    metadata: {
      ...inner.value,
      [AGENT_CONVERSATION_PAYLOAD_TRUNCATED_KEY]: true,
    },
  };
};

const clipEvents = (
  events: readonly unknown[],
  limit: number,
): readonly unknown[] => {
  return events.map((event) => clipEvent(event, limit));
};

/** Every clippable payload of one event, as text. */
const eventPayloadTexts = (event: unknown): readonly string[] => {
  if (!isRecord(event)) {
    return [];
  }

  const metadata = isRecord(event.metadata) ? event.metadata : {};
  const payloads = [
    ...CLIPPABLE_EVENT_KEYS.map((key) => event[key]),
    ...CLIPPABLE_METADATA_KEYS.map((key) => metadata[key]),
  ];

  return payloads
    .map(payloadText)
    .filter((text): text is string => text !== null);
};

/** The byte size of the largest clippable payload across every event. */
const largestPayloadBytes = (events: readonly unknown[]): number => {
  return events
    .flatMap(eventPayloadTexts)
    .reduce((largest, text) => Math.max(largest, utf8ByteLength(text)), 0);
};

const fitsToolMetadataCap = (envelope: Record<string, unknown>): boolean => {
  return (
    utf8ByteLength(JSON.stringify(envelope)) <=
    AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES
  );
};

/**
 * @description Finds the largest per-payload byte limit at which the clipped
 * envelope fits the cap, so only payloads above it are cut and every smaller one
 * survives whole. Returns null when even clipping every payload to empty does
 * not fit — the event skeleton alone is over the cap.
 */
const findPayloadLimit = (
  toolMetadata: Record<string, unknown>,
  events: readonly unknown[],
): number | null => {
  const fitsAt = (limit: number): boolean => {
    return fitsToolMetadataCap({
      ...toolMetadata,
      events: clipEvents(events, limit),
      truncated: true,
    });
  };

  if (!fitsAt(0)) {
    return null;
  }

  // Invariant: `low` fits; `high` does not (the unclipped envelope is over).
  let low = 0;
  let high = largestPayloadBytes(events);

  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (fitsAt(mid)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
};

/**
 * @description Caps tool_metadata JSON to {@link AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES}.
 * An `{ events }` envelope over the cap keeps every event — its kind, callId, tool
 * name, error flag and usage — and clips only the largest payloads (tool results,
 * arguments, thinking text) down to a shared byte limit, flagging each clipped
 * event's metadata with {@link AGENT_CONVERSATION_PAYLOAD_TRUNCATED_KEY} and the
 * envelope with `truncated: true`. Only when there is no events array, or the
 * event skeleton alone is over the cap, does it fall back to `{ truncated: true }`.
 */
export const capAgentConversationToolMetadata = (
  toolMetadata: Record<string, unknown> | null | undefined,
): {
  readonly toolMetadata: Record<string, unknown> | null;
  readonly toolMetadataTruncated: boolean;
} => {
  if (toolMetadata == null) {
    return { toolMetadata: null, toolMetadataTruncated: false };
  }

  if (fitsToolMetadataCap(toolMetadata)) {
    return { toolMetadata, toolMetadataTruncated: false };
  }

  const events = Array.isArray(toolMetadata.events)
    ? toolMetadata.events
    : null;
  const limit = events === null ? null : findPayloadLimit(toolMetadata, events);

  if (events === null || limit === null) {
    return {
      toolMetadata: { truncated: true },
      toolMetadataTruncated: true,
    };
  }

  return {
    toolMetadata: {
      ...toolMetadata,
      events: clipEvents(events, limit),
      truncated: true,
    },
    toolMetadataTruncated: true,
  };
};

/**
 * @description Clamps list pagination limit to allowed bounds.
 */
export const clampAgentConversationListLimit = (
  limit: number | undefined,
): number => {
  const resolved = limit ?? AGENT_CONVERSATION_LIST_DEFAULT_LIMIT;
  return Math.min(Math.max(resolved, 1), AGENT_CONVERSATION_LIST_MAX_LIMIT);
};

/**
 * @description Clamps message list pagination limit to allowed bounds.
 */
export const clampAgentConversationMessagesLimit = (
  limit: number | undefined,
): number => {
  const resolved = limit ?? AGENT_CONVERSATION_MESSAGES_DEFAULT_LIMIT;
  return Math.min(Math.max(resolved, 1), AGENT_CONVERSATION_MESSAGES_MAX_LIMIT);
};

/**
 * @description Reads the `MAX(sortOrder)` raw query result as a number; a missing row, `null` or empty string is 0.
 */
export const resolveCurrentMaxSortOrder = (
  result: { max: string | null } | undefined,
): number => {
  if (result?.max == null || result.max === '') {
    return 0;
  }
  return Number(result.max);
};
