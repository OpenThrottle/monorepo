import { describe, expect, test } from 'vitest';

import {
  formatDateTime,
  formatTimeZoneName,
  isoToDateTimeLocalValue,
  localDateTimeToUtcIso,
  parseDate,
  toDateTimeLocalValue,
} from '../dates';

const ISO = '2026-11-01T17:00:00.000Z';

describe('parseDate', () => {
  test('parses an ISO timestamp', () => {
    expect(parseDate(ISO)?.toISOString()).toBe(ISO);
  });

  test.each([null, undefined, '', 'not-a-date'])('is null for %s', (raw) => {
    expect(parseDate(raw)).toBeNull();
  });
});

describe('formatDateTime', () => {
  test('shows the date, time and short zone name', () => {
    expect(
      formatDateTime(ISO, { timeZone: 'UTC', withTimeZoneName: true }),
    ).toBe('Nov 1, 2026, 5:00 PM UTC');
  });

  test('formats in the requested zone, from a string or a Date', () => {
    const options = { timeZone: 'America/Los_Angeles', withTimeZoneName: true };

    expect(formatDateTime(ISO, options)).toBe('Nov 1, 2026, 9:00 AM PST');
    expect(formatDateTime(new Date(ISO), options)).toBe(
      'Nov 1, 2026, 9:00 AM PST',
    );
  });

  test('leaves the zone name off when asked', () => {
    expect(
      formatDateTime(ISO, { timeZone: 'UTC', withTimeZoneName: false }),
    ).toBe('Nov 1, 2026, 5:00 PM');
  });

  test('renders an em dash for an unparseable value', () => {
    expect(
      formatDateTime('not-a-date', { timeZone: 'UTC', withTimeZoneName: true }),
    ).toBe('—');
    expect(
      formatDateTime(new Date('nope'), {
        timeZone: 'UTC',
        withTimeZoneName: true,
      }),
    ).toBe('—');
  });
});

describe('formatTimeZoneName', () => {
  test('is the short zone name at that moment', () => {
    expect(formatTimeZoneName(new Date(ISO), 'America/New_York')).toBe('EST');
  });
});

describe('localDateTimeToUtcIso', () => {
  test('reads the value as local wall-clock time and returns UTC', () => {
    expect(localDateTimeToUtcIso('2026-11-01T10:30')).toBe(
      new Date(2026, 10, 1, 10, 30).toISOString(),
    );
  });

  test('is null for an empty or unparseable value', () => {
    expect(localDateTimeToUtcIso('')).toBeNull();
    expect(localDateTimeToUtcIso('soon')).toBeNull();
  });
});

describe('datetime-local values', () => {
  test('format a date in local time, zero-padded', () => {
    expect(toDateTimeLocalValue(new Date(2026, 0, 5, 7, 4))).toBe(
      '2026-01-05T07:04',
    );
  });

  test('round-trip an ISO timestamp, and are empty when there is none', () => {
    const iso = new Date(2026, 10, 1, 10, 30).toISOString();

    expect(isoToDateTimeLocalValue(iso)).toBe('2026-11-01T10:30');
    expect(isoToDateTimeLocalValue(null)).toBe('');
    expect(isoToDateTimeLocalValue('nope')).toBe('');
  });
});
