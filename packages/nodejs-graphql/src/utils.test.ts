import { afterEach, describe, expect, it } from 'vitest';
import {
  getGraphQLToken,
  getGraphQLUrl,
  parseDateTimeInResponse,
} from './utils.ts';

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
    const result = parseDateTimeInResponse(iso);

    expect(result).toBeInstanceOf(Date);
    expect((result as Date).toISOString()).toBe(iso);
  });

  it('parses an ISO string with a +HH:MM offset into a Date', () => {
    const result = parseDateTimeInResponse('2024-01-15T12:30:00+02:00');

    expect(result).toBeInstanceOf(Date);
    expect((result as Date).toISOString()).toBe('2024-01-15T10:30:00.000Z');
  });

  it('parses an ISO string with a +HHMM offset (no colon) into a Date', () => {
    const result = parseDateTimeInResponse('2024-01-15T12:30:00+0200');

    expect(result).toBeInstanceOf(Date);
    expect((result as Date).toISOString()).toBe('2024-01-15T10:30:00.000Z');
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
    const result = parseDateTimeInResponse([iso, 'plain', 7]);

    expect(Array.isArray(result)).toBe(true);
    const arr = result as ReadonlyArray<unknown>;
    expect(arr[0]).toBeInstanceOf(Date);
    expect((arr[0] as Date).toISOString()).toBe(iso);
    expect(arr[1]).toBe('plain');
    expect(arr[2]).toBe(7);
  });

  it('recurses into nested objects, leaving non-dates untouched', () => {
    const iso = '2024-01-15T12:30:00.000Z';
    const result = parseDateTimeInResponse({
      meta: { count: 1, label: 'plain' },
      nested: { createdAt: iso },
    });

    const out = result as {
      readonly meta: { readonly count: number; readonly label: string };
      readonly nested: { readonly createdAt: Date };
    };
    expect(out.nested.createdAt).toBeInstanceOf(Date);
    expect(out.nested.createdAt.toISOString()).toBe(iso);
    expect(out.meta.count).toBe(1);
    expect(out.meta.label).toBe('plain');
  });
});
