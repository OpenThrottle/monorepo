import type { StructuredLogRecord } from '../ports/logging-ports';

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
