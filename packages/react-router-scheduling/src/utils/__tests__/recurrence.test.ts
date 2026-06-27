import { describe, expect, it } from 'vitest';

import {
  RecurrenceFrequency,
  RecurrenceWeekday,
  buildRRule,
  parseRRule,
} from '../recurrence';
import type { RecurrenceSpec } from '../recurrence';

describe('buildRRule', () => {
  it('emits FREQ first and only the provided parts', () => {
    expect(buildRRule({ frequency: RecurrenceFrequency.Daily }).rule).toBe(
      'FREQ=DAILY',
    );
  });

  it('emits every supported part in a stable order', () => {
    const spec: RecurrenceSpec = {
      byDay: [RecurrenceWeekday.Monday, RecurrenceWeekday.Wednesday],
      byMonthDay: [1, 15],
      count: 10,
      frequency: RecurrenceFrequency.Weekly,
      interval: 2,
      until: '20261231T000000Z',
      weekStart: RecurrenceWeekday.Monday,
    };

    expect(buildRRule(spec).rule).toBe(
      'FREQ=WEEKLY;INTERVAL=2;COUNT=10;UNTIL=20261231T000000Z;BYDAY=MO,WE;BYMONTHDAY=1,15;WKST=MO',
    );
  });

  it('omits empty list fields', () => {
    expect(
      buildRRule({
        byDay: [],
        frequency: RecurrenceFrequency.Monthly,
      }).rule,
    ).toBe('FREQ=MONTHLY');
  });
});

describe('parseRRule', () => {
  it('parses a known weekly fixture', () => {
    expect(parseRRule('FREQ=WEEKLY;BYDAY=MO,TU;COUNT=4')).toEqual({
      byDay: [RecurrenceWeekday.Monday, RecurrenceWeekday.Tuesday],
      count: 4,
      frequency: RecurrenceFrequency.Weekly,
    });
  });

  it('tolerates a leading RRULE: prefix', () => {
    expect(parseRRule('RRULE:FREQ=DAILY;INTERVAL=3').frequency).toBe('DAILY');
  });

  it('accepts a RecurrenceRule object', () => {
    expect(
      parseRRule({ rule: 'FREQ=MONTHLY;BYMONTHDAY=1,15' }).byMonthDay,
    ).toEqual([1, 15]);
  });

  it('throws on a missing or unsupported FREQ', () => {
    expect(() => parseRRule('INTERVAL=2')).toThrow(/FREQ/);
    expect(() => parseRRule('FREQ=HOURLY')).toThrow(/FREQ/);
  });

  it('throws on an unsupported weekday', () => {
    expect(() => parseRRule('FREQ=WEEKLY;BYDAY=XX')).toThrow(/weekday/);
  });

  it('preserves an UNTIL value verbatim', () => {
    const spec = parseRRule('FREQ=DAILY;UNTIL=20261231T000000Z');
    expect(spec.until).toBe('20261231T000000Z');
  });

  it('ignores unknown RRULE parts', () => {
    // BYHOUR / RDATE / X-VENDOR are outside the supported subset and must be
    // dropped silently rather than throwing or leaking onto the spec.
    expect(
      parseRRule('FREQ=DAILY;BYHOUR=9;RDATE=20260101T000000Z;X-FOO=bar'),
    ).toEqual({ frequency: RecurrenceFrequency.Daily });
  });

  it('keeps the last value when a key is duplicated', () => {
    // The parser stores parts in a Map, so a repeated key takes the last
    // occurrence (this pins that behavior rather than leaving it incidental).
    expect(parseRRule('FREQ=DAILY;INTERVAL=2;INTERVAL=5').interval).toBe(5);
  });

  it('tolerates a trailing semicolon and empty segments', () => {
    expect(parseRRule('FREQ=WEEKLY;;COUNT=3;').count).toBe(3);
  });

  it('uppercases part keys before matching', () => {
    expect(parseRRule('freq=DAILY;interval=4').interval).toBe(4);
  });
});

describe('round-trips', () => {
  it('build -> parse preserves a full spec', () => {
    const spec: RecurrenceSpec = {
      byDay: [RecurrenceWeekday.Friday],
      count: 12,
      frequency: RecurrenceFrequency.Weekly,
      interval: 1,
      weekStart: RecurrenceWeekday.Sunday,
    };

    expect(parseRRule(buildRRule(spec))).toEqual(spec);
  });

  it('parse -> build preserves a canonical string', () => {
    const rule = 'FREQ=YEARLY;INTERVAL=1;BYMONTHDAY=25';
    expect(buildRRule(parseRRule(rule)).rule).toBe(rule);
  });

  it('build -> parse round-trips an UNTIL bound', () => {
    const spec: RecurrenceSpec = {
      frequency: RecurrenceFrequency.Daily,
      until: '20261231T235959Z',
    };
    expect(parseRRule(buildRRule(spec))).toEqual(spec);
  });

  it('parse -> build preserves a canonical UNTIL string', () => {
    const rule = 'FREQ=WEEKLY;UNTIL=20261231T000000Z;BYDAY=MO';
    expect(buildRRule(parseRRule(rule)).rule).toBe(rule);
  });
});
