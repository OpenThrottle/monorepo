import { describe, expect, test } from 'vitest';
import {
  formatCalendarDate,
  formatCalendarRange,
  toDatetimeLocalValue,
} from '../formatters';

describe('formatCalendarDate', () => {
  test('formats an ISO string as a human-readable date and time', () => {
    expect(formatCalendarDate('2026-08-12T09:05:00.000Z')).toMatch(
      /^Aug 12, 2026 \d{1,2}:\d{2} (AM|PM)$/,
    );
  });
});

describe('formatCalendarRange', () => {
  test('formats an all-day range as just the start date with an "All day" suffix', () => {
    expect(
      formatCalendarRange(
        '2026-08-12T12:00:00.000Z',
        '2026-08-12T23:59:00.000Z',
        true,
      ),
    ).toBe('Aug 12, 2026 · All day');
  });

  test('formats a timed range as a start datetime and end time separated by an en dash', () => {
    const result = formatCalendarRange(
      '2026-08-12T09:00:00.000Z',
      '2026-08-12T10:30:00.000Z',
      false,
    );
    expect(result).toContain(' – ');
    expect(result).toMatch(
      /^Aug 12, 2026 \d{1,2}:\d{2} (AM|PM) – \d{1,2}:\d{2} (AM|PM)$/,
    );
  });
});

describe('toDatetimeLocalValue', () => {
  test('formats an ISO string for a datetime-local input value', () => {
    expect(toDatetimeLocalValue('2026-08-12T09:05:00.000Z')).toMatch(
      /^2026-08-12T\d{2}:\d{2}$/,
    );
  });
});
