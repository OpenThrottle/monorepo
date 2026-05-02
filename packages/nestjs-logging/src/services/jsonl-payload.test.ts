import { describe, expect, it } from 'vitest';
import { NESTJS_LOGGING_LEVELS } from '../config/nestjs-logging-levels';
import type { StructuredLogRecord } from '../ports/logging-ports';
import {
  parseJsonlLineToStructuredRecord,
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

  it('omits context when empty string', () => {
    const record: StructuredLogRecord = {
      context: '',
      correlationId: undefined,
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'minimal',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: undefined,
    };

    expect(structuredLogRecordToJsonlPayload(record)).toEqual({
      level: 'log',
      message: 'minimal',
      timestamp: '2026-05-02T12:00:00.000Z',
    });
  });

  it('includes spanId, pid, hostname, extra when set', () => {
    const record: StructuredLogRecord = {
      context: 'Nest',
      correlationId: undefined,
      extra: { key: 'value', nested: { n: 1 } },
      hostname: 'Matthews-MacBook-Pro-2.local',
      level: NESTJS_LOGGING_LEVELS.debug,
      message: 'detailed',
      pid: 4242,
      spanId: 'span-a',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: undefined,
    };

    expect(structuredLogRecordToJsonlPayload(record)).toEqual({
      context: 'Nest',
      extra: { key: 'value', nested: { n: 1 } },
      hostname: 'Matthews-MacBook-Pro-2.local',
      level: 'debug',
      message: 'detailed',
      pid: 4242,
      spanId: 'span-a',
      timestamp: '2026-05-02T12:00:00.000Z',
    });
  });

  it('omits extra when undefined or empty object', () => {
    const base: Omit<StructuredLogRecord, 'extra'> = {
      context: '',
      correlationId: undefined,
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'x',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: undefined,
    };

    expect(structuredLogRecordToJsonlPayload({ ...base })).not.toHaveProperty(
      'extra',
    );
    expect(
      structuredLogRecordToJsonlPayload({
        ...base,
        extra: {},
      }),
    ).not.toHaveProperty('extra');
  });
});

describe('parseJsonlLineToStructuredRecord', () => {
  it('round-trips serialize output', () => {
    const record: StructuredLogRecord = {
      context: 'App',
      correlationId: 'c1',
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'hi',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: 't1',
    };

    const line = serializeStructuredLogLine(record).trimEnd();
    const parsed = parseJsonlLineToStructuredRecord(line);

    expect(parsed).toEqual(record);
  });

  it('returns undefined for invalid JSON', () => {
    expect(parseJsonlLineToStructuredRecord('{not json')).toBeUndefined();
  });

  it('parses minimal line with only timestamp, level, message (context normalizes to empty)', () => {
    const line =
      '{"level":"log","message":"only core","timestamp":"2026-05-02T12:00:00.000Z"}';
    expect(parseJsonlLineToStructuredRecord(line)).toEqual({
      context: '',
      correlationId: undefined,
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'only core',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: undefined,
    });
  });

  it('parses optional spanId, pid, hostname, extra', () => {
    const line = JSON.stringify({
      extra: { a: 1 },
      hostname: 'box.local',
      level: 'warn',
      message: 'with optionals',
      pid: 9000,
      spanId: 's1',
      timestamp: '2026-05-02T12:00:00.000Z',
    });

    expect(parseJsonlLineToStructuredRecord(line)).toEqual({
      context: '',
      correlationId: undefined,
      extra: { a: 1 },
      hostname: 'box.local',
      level: NESTJS_LOGGING_LEVELS.warn,
      message: 'with optionals',
      pid: 9000,
      spanId: 's1',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: undefined,
    });
  });

  it('returns undefined when context is present but not a string', () => {
    expect(
      parseJsonlLineToStructuredRecord(
        '{"context":99,"level":"log","message":"bad","timestamp":"2026-05-02T12:00:00.000Z"}',
      ),
    ).toBeUndefined();
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

  it('round-trips empty context via omission', () => {
    const record: StructuredLogRecord = {
      context: '',
      correlationId: undefined,
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'no ctx',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: undefined,
    };

    const parsed = parseJsonlLineToStructuredRecord(
      serializeStructuredLogLine(record).trimEnd(),
    );

    expect(parsed).toEqual(record);
  });

  it('round-trips all optional wire fields', () => {
    const record: StructuredLogRecord = {
      context: 'Svc',
      correlationId: 'cid',
      extra: { tags: ['a'] },
      hostname: 'h.local',
      level: NESTJS_LOGGING_LEVELS.verbose,
      message: 'full',
      pid: 7,
      spanId: 'sp',
      timestampIso: '2026-05-02T12:00:00.001Z',
      traceId: 'tr',
    };

    const parsed = parseJsonlLineToStructuredRecord(
      serializeStructuredLogLine(record).trimEnd(),
    );

    expect(parsed).toEqual(record);
  });
});
