import { afterEach, describe, expect, it } from 'vitest';
import {
  getGraphQLToken,
  getGraphQLUrl,
  parseDateTimeInResponse,
} from './utils.ts';

function assertDate(value: unknown): asserts value is Date {
  if (!(value instanceof Date)) {
    throw new Error(`Expected a Date, received ${String(value)}`);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

describe('getGraphQLUrl', () => {
  const original = process.env.API_URL_INTERNAL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.API_URL_INTERNAL;
    } else {
      process.env.API_URL_INTERNAL = original;
    }
  });

  it('throws when API_URL_INTERNAL is unset', () => {
    delete process.env.API_URL_INTERNAL;

    expect(() => getGraphQLUrl()).toThrow('API_URL_INTERNAL is not set');
  });

  it('throws when API_URL_INTERNAL is an empty string', () => {
    process.env.API_URL_INTERNAL = '';

    expect(() => getGraphQLUrl()).toThrow('API_URL_INTERNAL is not set');
  });

  it('appends /graphql to the base URL', () => {
    process.env.API_URL_INTERNAL = 'http://localhost:6021';

    expect(getGraphQLUrl()).toBe('http://localhost:6021/graphql');
  });

  it('strips a single trailing slash before appending /graphql', () => {
    process.env.API_URL_INTERNAL = 'http://localhost:6021/';

    expect(getGraphQLUrl()).toBe('http://localhost:6021/graphql');
  });
});

describe('getGraphQLToken', () => {
  const original = process.env.API_TOKEN;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.API_TOKEN;
    } else {
      process.env.API_TOKEN = original;
    }
  });

  it('returns the API_TOKEN env value when set', () => {
    process.env.API_TOKEN = 'secret-token';

    expect(getGraphQLToken()).toBe('secret-token');
  });

  it('returns undefined when API_TOKEN is unset', () => {
    delete process.env.API_TOKEN;

    expect(getGraphQLToken()).toBeUndefined();
  });
});

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
