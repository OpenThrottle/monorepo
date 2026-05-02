import {
  ALL_NESTJS_LOGGING_LEVELS,
  type NestjsLoggingLevel,
} from '../config/nestjs-logging-levels';
import type { StructuredLogRecord } from '../ports/logging-ports';

const ALLOWED_LEVELS = new Set<string>(ALL_NESTJS_LOGGING_LEVELS);

const isNestjsLoggingLevel = (value: unknown): value is NestjsLoggingLevel =>
  typeof value === 'string' && ALLOWED_LEVELS.has(value);

/**
 * @description Maps {@link StructuredLogRecord} to the on-disk JSONL object shape (see `docs/openclaw-style-contract.md`).
 */
export const structuredLogRecordToJsonlPayload = (
  record: StructuredLogRecord,
): Readonly<Record<string, unknown>> => {
  const payload: Record<string, unknown> = {
    context: record.context,
    level: record.level,
    message: record.message,
    timestamp: record.timestampIso,
  };

  if (record.correlationId !== undefined) {
    payload.correlationId = record.correlationId;
  }

  if (record.traceId !== undefined) {
    payload.traceId = record.traceId;
  }

  return payload;
};

/**
 * @description One UTF-8 JSON line with trailing `\n` for append-only sinks.
 */
export const serializeStructuredLogLine = (
  record: StructuredLogRecord,
): string => `${JSON.stringify(structuredLogRecordToJsonlPayload(record))}\n`;

/**
 * @description Parses one JSONL object line into {@link StructuredLogRecord}; returns undefined for empty or invalid lines.
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
    const context = raw.context;
    const level = raw.level;
    const message = raw.message;
    const timestamp =
      typeof raw.timestamp === 'string'
        ? raw.timestamp
        : typeof raw.timestampIso === 'string'
          ? raw.timestampIso
          : undefined;

    if (
      typeof context !== 'string' ||
      typeof message !== 'string' ||
      timestamp === undefined ||
      !isNestjsLoggingLevel(level)
    ) {
      return undefined;
    }

    const correlationId = raw.correlationId;
    const traceId = raw.traceId;

    return {
      context,
      correlationId:
        typeof correlationId === 'string' ? correlationId : undefined,
      level,
      message,
      timestampIso: timestamp,
      traceId: typeof traceId === 'string' ? traceId : undefined,
    };
  } catch {
    return undefined;
  }
};
