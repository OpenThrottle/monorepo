import { describe, expect, test } from 'vitest';

import {
  isoToDateTimeLocalValue,
  localDateTimeToUtcIso,
  toDateTimeLocalValue,
  validateScheduleLocalDateTime,
} from '../schedule';

const NOW = new Date(2026, 9, 26, 12, 0).getTime();

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

describe('validateScheduleLocalDateTime', () => {
  test('accepts a future time', () => {
    expect(validateScheduleLocalDateTime('2026-10-26T12:01', NOW)).toBeNull();
  });

  test('rejects a past time and the present moment', () => {
    expect(validateScheduleLocalDateTime('2026-10-26T11:59', NOW)).toBe(
      'Pick a time in the future.',
    );
    expect(validateScheduleLocalDateTime('2026-10-26T12:00', NOW)).toBe(
      'Pick a time in the future.',
    );
  });

  test('rejects an empty value', () => {
    expect(validateScheduleLocalDateTime('', NOW)).toBe(
      'Choose a date and time.',
    );
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
