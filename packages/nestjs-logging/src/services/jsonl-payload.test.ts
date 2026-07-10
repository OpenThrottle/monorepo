import { describe, expect, it } from 'vitest';
import { NESTJS_LOGGING_LEVELS } from '../config/nestjs-logging-levels';
import type { JsonValue, StructuredLogRecord } from '../ports/logging-ports';
import {
  orderJsonlRootObjectKeys,
  parseJsonlLineToStructuredRecord,
  serializeStructuredLogLine,
  structuredLogRecordToJsonlPayload,
} from './jsonl-payload';
import { createLogRedactor } from './log-redaction';

/**
 * @description Cast-free partial-mock helper: returns the given value typed as `T`. Used here to
 * feed deliberately non-JSON `extra` fixtures (bigint, functions, cycles) into the `JsonValue`
 * record type. The public overload narrows to `T`; the implementation stays `unknown`.
 */
function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

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

  it('redacts secrets in message and extra by default (default-on chokepoint)', () => {
    const record: StructuredLogRecord = {
      context: 'Auth',
      correlationId: undefined,
      extra: { authorization: 'Bearer abc.def', userId: 7 },
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'login with Bearer abc.def',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: undefined,
    };

    expect(structuredLogRecordToJsonlPayload(record)).toEqual({
      context: 'Auth',
      extra: { authorization: '[REDACTED]', userId: 7 },
      level: 'log',
      message: 'login with [REDACTED]',
      timestamp: '2026-05-02T12:00:00.000Z',
    });
  });

  it('honors an explicit disabled redactor (verbatim message and extra)', () => {
    const record: StructuredLogRecord = {
      context: '',
      correlationId: undefined,
      extra: { password: 'hunter2' },
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'password=hunter2',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: undefined,
    };

    expect(
      structuredLogRecordToJsonlPayload(record, createLogRedactor(false)),
    ).toEqual({
      extra: { password: 'hunter2' },
      level: 'log',
      message: 'password=hunter2',
      timestamp: '2026-05-02T12:00:00.000Z',
    });
  });

  it('drops non-JSON extra values (bigint, undefined, function) and keeps valid siblings', () => {
    const dirtyExtra = asMock<Readonly<Record<string, JsonValue>>>({
      big: 10n,
      fn: () => undefined,
      missing: undefined,
      ok: 'kept',
      okNumber: 42,
    });

    const record: StructuredLogRecord = {
      context: '',
      correlationId: undefined,
      extra: dirtyExtra,
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'dirty extra',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: undefined,
    };

    expect(structuredLogRecordToJsonlPayload(record)).toEqual({
      extra: { ok: 'kept', okNumber: 42 },
      level: 'log',
      message: 'dirty extra',
      timestamp: '2026-05-02T12:00:00.000Z',
    });
  });

  it('omits extra entirely when no value is JSON-serializable', () => {
    const allInvalid = asMock<Readonly<Record<string, JsonValue>>>({
      big: 1n,
      fn: () => undefined,
    });

    const record: StructuredLogRecord = {
      context: '',
      correlationId: undefined,
      extra: allInvalid,
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'no valid extra',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: undefined,
    };

    expect(structuredLogRecordToJsonlPayload(record)).not.toHaveProperty(
      'extra',
    );
  });

  it('drops a circular extra value without throwing and serializes safely', () => {
    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;
    const extraWithCycle = asMock<Readonly<Record<string, JsonValue>>>({
      circular,
      safe: 'present',
    });

    const record: StructuredLogRecord = {
      context: '',
      correlationId: undefined,
      extra: extraWithCycle,
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'cyclic extra',
      timestampIso: '2026-05-02T12:00:00.000Z',
      traceId: undefined,
    };

    expect(structuredLogRecordToJsonlPayload(record)).toEqual({
      extra: { safe: 'present' },
      level: 'log',
      message: 'cyclic extra',
      timestamp: '2026-05-02T12:00:00.000Z',
    });

    expect(() => serializeStructuredLogLine(record)).not.toThrow();
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

  describe('forward compatibility: unknown top-level keys (contract §4)', () => {
    it('parses core fields when the line includes unrecognized keys', () => {
      const line = JSON.stringify({
        experimentalPayload: { nested: true },
        level: 'log',
        message: 'future-proof line',
        schemaVersion: 2,
        timestamp: '2026-05-02T12:00:00.000Z',
        vendorReserved: 'ignored',
      });

      expect(parseJsonlLineToStructuredRecord(line)).toEqual({
        context: '',
        correlationId: undefined,
        level: NESTJS_LOGGING_LEVELS.log,
        message: 'future-proof line',
        timestampIso: '2026-05-02T12:00:00.000Z',
        traceId: undefined,
      });
    });

    it('maps known optional fields and still ignores unknown keys', () => {
      const line = JSON.stringify({
        context: 'App',
        customTags: ['a', 'b'],
        level: 'warn',
        message: 'mixed keys',
        reservedForV2: null,
        timestamp: '2026-05-02T12:00:00.000Z',
        traceId: 't-1',
      });

      expect(parseJsonlLineToStructuredRecord(line)).toEqual({
        context: 'App',
        correlationId: undefined,
        level: NESTJS_LOGGING_LEVELS.warn,
        message: 'mixed keys',
        timestampIso: '2026-05-02T12:00:00.000Z',
        traceId: 't-1',
      });
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

describe('deterministic JSONL root serialization', () => {
  it('orderJsonlRootObjectKeys: shuffled input key order yields identical JSON.stringify', () => {
    const orderedA = orderJsonlRootObjectKeys({
      correlationId: 'c',
      level: 'log',
      message: 'm',
      timestamp: '2026-05-02T12:00:00.000Z',
      traceId: 't',
    });

    const shuffledSource: Record<string, unknown> = {};
    shuffledSource.traceId = 't';
    shuffledSource.message = 'm';
    shuffledSource.timestamp = '2026-05-02T12:00:00.000Z';
    shuffledSource.correlationId = 'c';
    shuffledSource.level = 'log';

    const orderedB = orderJsonlRootObjectKeys(shuffledSource);

    expect(JSON.stringify(orderedB)).toBe(JSON.stringify(orderedA));
    expect(JSON.stringify(orderedA)).toBe(
      '{"timestamp":"2026-05-02T12:00:00.000Z","level":"log","message":"m","correlationId":"c","traceId":"t"}',
    );
  });

  it('appends unknown top-level keys in lexicographic order after contract keys', () => {
    const ordered = orderJsonlRootObjectKeys({
      apple: 2,
      experimental: true,
      level: 'warn',
      message: 'x',
      timestamp: '2026-05-02T12:00:00.000Z',
      zebra: 1,
    });

    expect(JSON.stringify(ordered)).toBe(
      '{"timestamp":"2026-05-02T12:00:00.000Z","level":"warn","message":"x","apple":2,"experimental":true,"zebra":1}',
    );
  });

  it('serializeStructuredLogLine: same logical optionals produce exact wire strings (regression on key order)', () => {
    const ts = '2026-05-02T12:00:00.000Z';
    const minimal: StructuredLogRecord = {
      context: '',
      correlationId: undefined,
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'core',
      timestampIso: ts,
      traceId: undefined,
    };

    expect(serializeStructuredLogLine(minimal).trimEnd()).toBe(
      `{"timestamp":"${ts}","level":"log","message":"core"}`,
    );

    const withCorrelationOnly: StructuredLogRecord = {
      ...minimal,
      correlationId: 'req-7',
      message: 'with-cid',
    };

    expect(serializeStructuredLogLine(withCorrelationOnly).trimEnd()).toBe(
      `{"timestamp":"${ts}","level":"log","message":"with-cid","correlationId":"req-7"}`,
    );

    const withTraceOnly: StructuredLogRecord = {
      ...minimal,
      message: 'with-trace',
      traceId: 'tr-9',
    };

    expect(serializeStructuredLogLine(withTraceOnly).trimEnd()).toBe(
      `{"timestamp":"${ts}","level":"log","message":"with-trace","traceId":"tr-9"}`,
    );

    const withHostnameNoCorrelation: StructuredLogRecord = {
      ...minimal,
      hostname: 'box.local',
      message: 'host-only',
    };

    expect(
      serializeStructuredLogLine(withHostnameNoCorrelation).trimEnd(),
    ).toBe(
      `{"timestamp":"${ts}","level":"log","message":"host-only","hostname":"box.local"}`,
    );
  });

  it('optional fields after message follow contract order; omitting one does not shift later keys before earlier contract slots', () => {
    const ts = '2026-05-02T12:00:00.000Z';
    const withSpanNoCorrelation: StructuredLogRecord = {
      context: '',
      correlationId: undefined,
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'span-no-cid',
      spanId: 'sp-1',
      timestampIso: ts,
      traceId: 'tr-1',
    };

    const line = serializeStructuredLogLine(withSpanNoCorrelation).trimEnd();
    expect(line).toBe(
      `{"timestamp":"${ts}","level":"log","message":"span-no-cid","traceId":"tr-1","spanId":"sp-1"}`,
    );
    expect(line.indexOf('"traceId"')).toBeLessThan(line.indexOf('"spanId"'));
  });

  it('does not reorder keys inside nested extra', () => {
    const ts = '2026-05-02T12:00:00.000Z';
    const extraOutOfLexOrder: Record<string, JsonValue> = {};
    extraOutOfLexOrder.zzz = 1;
    extraOutOfLexOrder.aaa = 2;

    const record: StructuredLogRecord = {
      context: '',
      correlationId: undefined,
      extra: extraOutOfLexOrder,
      level: NESTJS_LOGGING_LEVELS.log,
      message: 'nested-order',
      timestampIso: ts,
      traceId: undefined,
    };

    expect(serializeStructuredLogLine(record).trimEnd()).toContain(
      '"extra":{"zzz":1,"aaa":2}',
    );
  });
});
