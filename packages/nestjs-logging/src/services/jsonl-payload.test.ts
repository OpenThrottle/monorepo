import { describe, expect, it } from 'vitest';
import { NESTJS_LOGGING_LEVELS } from '../config/nestjs-logging-levels';
import type { StructuredLogRecord } from '../ports/logging-ports';
import {
  serializeStructuredLogLine,
  structuredLogRecordToJsonlPayload,
} from './jsonl-payload';

describe('structuredLogRecordToJsonlPayload', () => {
  it('maps timestampIso to timestamp and omits undefined ids', () => {
    const record: StructuredLogRecord = {
      context: 'App',
      correlationId: undefined,
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'hello',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: undefined,
    };

    expect(structuredLogRecordToJsonlPayload(record)).toEqual({
      context: 'App',
      level: 'log',
      message: 'hello',
      timestamp: '2026-05-02T12:00:00.000Z',
    });
  });

  it('includes correlationId and traceId when set', () => {
    const record: StructuredLogRecord = {
      context: 'App',
      correlationId: 'req-1',
      level: NESTJS_LOGGING_LEVELS.warn,
      message: 'slow',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: 'trace-9',
    };

    expect(structuredLogRecordToJsonlPayload(record)).toEqual({
      context: 'App',
      correlationId: 'req-1',
      level: 'warn',
      message: 'slow',
      timestamp: '2026-05-02T12:00:00.000Z',
      traceId: 'trace-9',
    });
  });
});

describe('serializeStructuredLogLine', () => {
  it('produces one parseable JSON object per line with trailing newline', () => {
    const record: StructuredLogRecord = {
      context: 'X',
      correlationId: undefined,
      level: NESTJS_LOGGING_LEVELS.error,
      message: 'oops',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: undefined,
    };

    const line = serializeStructuredLogLine(record);

    expect(line.endsWith('\n')).toBe(true);
    expect(line.split('\n').length).toBe(2);
    expect(JSON.parse(line.trimEnd())).toMatchObject({
      level: 'error',
      message: 'oops',
    });
  });
});
