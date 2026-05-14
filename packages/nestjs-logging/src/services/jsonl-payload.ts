import {
  ALL_NESTJS_LOGGING_LEVELS,
  type NestjsLoggingLevel,
} from '../config/nestjs-logging-levels';
import type {
  JsonPrimitive,
  JsonValue,
  StructuredLogRecord,
} from '../ports/logging-ports';

/**
 * @description JSONL root object key order is **explicit per contract** (see
 * {@link JSONL_ROOT_KEY_ORDER} and `docs/openclaw-style-contract.md` §1.2.2).
 * Lexicographic sort of all keys was rejected so required fields stay human-first;
 * any **unknown** top-level keys are appended in lexicographic order for stable
 * forward-compatible emission. Ordering applies only at the root; nested `extra`
 * is unchanged unless the contract says otherwise.
 */

/**
 * @description Canonical top-level key order for JSONL root objects. Keep in sync
 * with `docs/openclaw-style-contract.md` §1.2.2 (append new contract keys here).
 */
const JSONL_ROOT_KEY_ORDER: readonly string[] = [
  'timestamp',
  'level',
  'message',
  'context',
  'correlationId',
  'traceId',
  'spanId',
  'pid',
  'hostname',
  'extra',
];

/**
 * @description Reorders a plain object's **own** enumerable keys for deterministic
 * {@link JSON.stringify} output. Known contract keys follow {@link JSONL_ROOT_KEY_ORDER};
 * any other keys are appended in lexicographic order.
 */
export const orderJsonlRootObjectKeys = (
  payload: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => {
  const ordered: Record<string, unknown> = {};
  const seen = new Set<string>();

  for (const key of JSONL_ROOT_KEY_ORDER) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      ordered[key] = payload[key];
      seen.add(key);
    }
  }

  const remainder = Object.keys(payload)
    .filter((key) => !seen.has(key))
    .sort((a, b) => a.localeCompare(b));

  for (const key of remainder) {
    ordered[key] = payload[key];
  }

  return ordered;
};

const ALLOWED_LEVELS = new Set<string>(ALL_NESTJS_LOGGING_LEVELS);

const isNestjsLoggingLevel = (value: unknown): value is NestjsLoggingLevel =>
  typeof value === 'string' && ALLOWED_LEVELS.has(value);

const isJsonPrimitive = (value: unknown): value is JsonPrimitive =>
  value === null ||
  typeof value === 'boolean' ||
  typeof value === 'number' ||
  typeof value === 'string';

/**
 * @description Validates JSON-serializable values for {@link StructuredLogRecord.extra}.
 */
const isJsonValue = (value: unknown): value is JsonValue => {
  if (isJsonPrimitive(value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).every(
      ([key, entry]) => typeof key === 'string' && isJsonValue(entry),
    );
  }
  return false;
};

/**
 * @description Plain JSON object suitable for {@link StructuredLogRecord.extra}.
 */
const isJsonRecord = (
  value: unknown,
): value is Readonly<Record<string, JsonValue>> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  isJsonValue(value);

/**
 * @description Parses wire `extra` when present; returns undefined if absent or invalid.
 */
const parseExtraField = (
  raw: unknown,
): Readonly<Record<string, JsonValue>> | undefined => {
  if (raw === undefined || !isJsonRecord(raw)) {
    return undefined;
  }
  return raw;
};

/**
 * @description Maps {@link StructuredLogRecord} to the on-disk JSONL object shape (see `docs/openclaw-style-contract.md`).
 */
export const structuredLogRecordToJsonlPayload = (
  record: StructuredLogRecord,
): Readonly<Record<string, unknown>> => {
  const payload: Record<string, unknown> = {
    level: record.level,
    message: record.message,
    timestamp: record.timestampIso,
  };

  if (record.context !== '') {
    payload.context = record.context;
  }

  if (record.correlationId !== undefined) {
    payload.correlationId = record.correlationId;
  }

  if (record.extra !== undefined && Object.keys(record.extra).length > 0) {
    payload.extra = record.extra;
  }

  if (record.hostname !== undefined) {
    payload.hostname = record.hostname;
  }

  if (record.pid !== undefined) {
    payload.pid = record.pid;
  }

  if (record.spanId !== undefined) {
    payload.spanId = record.spanId;
  }

  if (record.traceId !== undefined) {
    payload.traceId = record.traceId;
  }

  return orderJsonlRootObjectKeys(payload);
};

/**
 * @description One UTF-8 JSON line with trailing `\n` for append-only sinks.
 */
export const serializeStructuredLogLine = (
  record: StructuredLogRecord,
): string => `${JSON.stringify(structuredLogRecordToJsonlPayload(record))}\n`;

/**
 * @description Parses one JSONL object line into {@link StructuredLogRecord}; returns undefined for empty or invalid lines. Extra top-level keys are ignored (see `docs/openclaw-style-contract.md` §4).
 */
export const parseJsonlLineToStructuredRecord = (
  line: string,
): StructuredLogRecord | undefined => {
  const trimmed = line.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- JSON.parse is unknown; validated below
    const raw = JSON.parse(trimmed) as Record<string, unknown>;
    let context: string;
    if (raw.context === undefined) {
      context = '';
    } else if (typeof raw.context === 'string') {
      context = raw.context;
    } else {
      return undefined;
    }

    const level = raw.level;
    const message = raw.message;
    const timestamp =
      typeof raw.timestamp === 'string'
        ? raw.timestamp
        : typeof raw.timestampIso === 'string'
          ? raw.timestampIso
          : undefined;

    if (
      typeof message !== 'string' ||
      timestamp === undefined ||
      !isNestjsLoggingLevel(level)
    ) {
      return undefined;
    }

    const correlationId = raw.correlationId;
    const traceId = raw.traceId;
    const spanId = raw.spanId;
    const hostname = raw.hostname;
    const pidRaw = raw.pid;
    const extra = parseExtraField(raw.extra);

    const parsedPid =
      typeof pidRaw === 'number' &&
      Number.isFinite(pidRaw) &&
      Number.isInteger(pidRaw)
        ? pidRaw
        : undefined;

    return {
      context,
      correlationId:
        typeof correlationId === 'string' ? correlationId : undefined,
      level,
      message,
      timestampIso: timestamp,
      traceId: typeof traceId === 'string' ? traceId : undefined,
      ...(typeof spanId === 'string' ? { spanId } : {}),
      ...(typeof hostname === 'string' ? { hostname } : {}),
      ...(parsedPid !== undefined ? { pid: parsedPid } : {}),
      ...(extra !== undefined ? { extra } : {}),
    };
  } catch {
    return undefined;
  }
};
