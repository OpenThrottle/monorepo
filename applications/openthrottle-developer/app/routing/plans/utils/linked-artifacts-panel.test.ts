import { describe, expect, test } from 'vitest';
import { formatProducedAt, toDate, toMillis } from './linked-artifacts-panel';

describe('toDate', () => {
  test('coerces a numeric epoch millis value', () => {
    const date = toDate(0);

    expect(date.toISOString()).toBe('1970-01-01T00:00:00.000Z');
  });

  test('coerces an ISO string value', () => {
    const date = toDate('2026-01-01T00:00:00.000Z');

    expect(date.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  test('produces an invalid date for unparsable strings', () => {
    const date = toDate('not-a-date');

    expect(Number.isNaN(date.getTime())).toBe(true);
  });
});

describe('toMillis', () => {
  test('returns millis for a valid numeric value', () => {
    expect(toMillis(1_700_000_000_000)).toBe(1_700_000_000_000);
  });

  test('returns millis for a valid ISO string', () => {
    expect(toMillis('2026-01-01T00:00:00.000Z')).toBe(
      new Date('2026-01-01T00:00:00.000Z').getTime(),
    );
  });

  test('returns 0 for an invalid value', () => {
    expect(toMillis('not-a-date')).toBe(0);
  });
});

describe('formatProducedAt', () => {
  test('formats a valid numeric epoch value using locale formatting', () => {
    const millis = Date.UTC(2026, 0, 1);

    expect(formatProducedAt(millis)).toBe(new Date(millis).toLocaleString());
  });

  test('formats a valid ISO string using locale formatting', () => {
    const value = '2026-01-01T00:00:00.000Z';

    expect(formatProducedAt(value)).toBe(new Date(value).toLocaleString());
  });

  test('falls back to the raw value when unparsable', () => {
    expect(formatProducedAt('not-a-date')).toBe('not-a-date');
  });
});
