import { isRecord } from '@openthrottle/nodejs-utils';
import { describe, expect, it } from 'vitest';

import { parseDateTimeInResponse } from '../response.ts';

function assertDate(value: unknown): asserts value is Date {
  if (!(value instanceof Date)) {
    throw new Error(`Expected a Date, received ${String(value)}`);
  }
}

describe('parseDateTimeInResponse', () => {
  it('returns null and undefined unchanged', () => {
    expect(parseDateTimeInResponse(null)).toBeNull();
    expect(parseDateTimeInResponse(undefined)).toBeUndefined();
  });

  it('parses an ISO string with a Z (UTC) suffix into a Date', () => {
    const iso = '2024-01-15T12:30:00.000Z';
    const result = parseDateTimeInResponse<unknown>(iso);

    expect(result).toBeInstanceOf(Date);
    assertDate(result);
    expect(result.toISOString()).toBe(iso);
  });

  it('parses an ISO string with a +HH:MM offset into a Date', () => {
    const result = parseDateTimeInResponse<unknown>(
      '2024-01-15T12:30:00+02:00',
    );

    expect(result).toBeInstanceOf(Date);
    assertDate(result);
    expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z');
  });

  it('parses an ISO string with a +HHMM offset (no colon) into a Date', () => {
    const result = parseDateTimeInResponse<unknown>('2024-01-15T12:30:00+0200');

    expect(result).toBeInstanceOf(Date);
    assertDate(result);
    expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z');
  });

  it('parses an ISO string with no zone suffix into a Date', () => {
    const result = parseDateTimeInResponse('2024-01-15T12:30:00');

    expect(result).toBeInstanceOf(Date);
  });

  it('leaves non-date strings intact', () => {
    expect(parseDateTimeInResponse('hello')).toBe('hello');
    expect(parseDateTimeInResponse('2024-01-15')).toBe('2024-01-15');
    expect(parseDateTimeInResponse('12:30:00')).toBe('12:30:00');
    expect(parseDateTimeInResponse('not-a-2024-01-15T12:30:00Z')).toBe(
      'not-a-2024-01-15T12:30:00Z',
    );
  });

  it('leaves non-string scalars intact', () => {
    expect(parseDateTimeInResponse(42)).toBe(42);
    expect(parseDateTimeInResponse(true)).toBe(true);
  });

  it('parses ISO strings inside arrays', () => {
    const iso = '2024-01-15T12:30:00.000Z';
    const result = parseDateTimeInResponse<unknown>([iso, 'plain', 7]);

    expect(Array.isArray(result)).toBe(true);
    if (!Array.isArray(result)) {
      throw new Error('Expected an array');
    }
    assertDate(result[0]);
    expect(result[0].toISOString()).toBe(iso);
    expect(result[1]).toBe('plain');
    expect(result[2]).toBe(7);
  });

  it('recurses into nested objects, leaving non-dates untouched', () => {
    const iso = '2024-01-15T12:30:00.000Z';
    const result = parseDateTimeInResponse<unknown>({
      meta: { count: 1, label: 'plain' },
      nested: { createdAt: iso },
    });

    expect(result).toMatchObject({ meta: { count: 1, label: 'plain' } });
    if (!isRecord(result) || !isRecord(result.nested)) {
      throw new Error('Expected a nested object');
    }
    assertDate(result.nested.createdAt);
    expect(result.nested.createdAt.toISOString()).toBe(iso);
  });
});
