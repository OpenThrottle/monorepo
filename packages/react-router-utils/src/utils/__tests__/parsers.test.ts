import { describe, expect, test } from 'vitest';
import {
  DEFAULT_PAGINATION_LIMIT,
  DEFAULT_PAGINATION_PAGE,
} from '../../config/defaults';
import {
  parsePagination,
  parsePaginationLimit,
  parsePaginationPage,
  parseShortUUID,
} from '../parsers';

describe('parsePaginationPage', () => {
  test('parses a valid page', () => {
    expect(parsePaginationPage('3')).toBe(3);
  });

  test('floors fractional pages', () => {
    expect(parsePaginationPage('3.9')).toBe(3);
  });

  test('falls back for missing, empty, and non-numeric values', () => {
    expect(parsePaginationPage(null)).toBe(DEFAULT_PAGINATION_PAGE);
    expect(parsePaginationPage(undefined)).toBe(DEFAULT_PAGINATION_PAGE);
    expect(parsePaginationPage('')).toBe(DEFAULT_PAGINATION_PAGE);
    expect(parsePaginationPage('abc')).toBe(DEFAULT_PAGINATION_PAGE);
  });

  test('falls back for values below one', () => {
    expect(parsePaginationPage('0')).toBe(DEFAULT_PAGINATION_PAGE);
    expect(parsePaginationPage('-1')).toBe(DEFAULT_PAGINATION_PAGE);
  });

  test('honours a custom default page', () => {
    expect(parsePaginationPage(null, 4)).toBe(4);
  });

  test('never upper-clamps the page', () => {
    expect(parsePaginationPage('9999')).toBe(9999);
  });
});

describe('parsePaginationLimit', () => {
  test('parses a valid limit', () => {
    expect(parsePaginationLimit('42')).toBe(42);
  });

  test('floors fractional limits', () => {
    expect(parsePaginationLimit('42.7')).toBe(42);
  });

  test('falls back for missing, empty, non-numeric, and below-one values', () => {
    expect(parsePaginationLimit(null)).toBe(DEFAULT_PAGINATION_LIMIT);
    expect(parsePaginationLimit('')).toBe(DEFAULT_PAGINATION_LIMIT);
    expect(parsePaginationLimit('abc')).toBe(DEFAULT_PAGINATION_LIMIT);
    expect(parsePaginationLimit('0')).toBe(DEFAULT_PAGINATION_LIMIT);
    expect(parsePaginationLimit('-1')).toBe(DEFAULT_PAGINATION_LIMIT);
  });

  test('honours a custom default limit', () => {
    expect(parsePaginationLimit(null, { defaultLimit: 10 })).toBe(10);
  });

  test('clamps to maxLimit', () => {
    expect(parsePaginationLimit('500', { maxLimit: 100 })).toBe(100);
  });

  test('clamps to minLimit (queue jobs: limit=1 with a floor of 10)', () => {
    expect(parsePaginationLimit('1', { maxLimit: 100, minLimit: 10 })).toBe(10);
  });

  test('leaves in-range values untouched when both bounds are set', () => {
    expect(parsePaginationLimit('25', { maxLimit: 100, minLimit: 10 })).toBe(
      25,
    );
  });

  test('does not clamp the fallback default', () => {
    expect(parsePaginationLimit(null, { defaultLimit: 5, minLimit: 10 })).toBe(
      5,
    );
  });
});

describe('parsePagination', () => {
  test('returns package defaults for empty search params', () => {
    expect(parsePagination(new URLSearchParams())).toStrictEqual({
      limit: DEFAULT_PAGINATION_LIMIT,
      offset: 0,
      page: DEFAULT_PAGINATION_PAGE,
    });
  });

  test('computes offset from page and limit', () => {
    expect(
      parsePagination(new URLSearchParams('page=3&limit=10')),
    ).toStrictEqual({ limit: 10, offset: 20, page: 3 });
  });

  test('applies option overrides', () => {
    expect(
      parsePagination(new URLSearchParams('page=2&limit=500'), {
        defaultLimit: 10,
        maxLimit: 100,
      }),
    ).toStrictEqual({ limit: 100, offset: 100, page: 2 });
  });

  test('falls back to the custom default limit when limit is absent', () => {
    expect(
      parsePagination(new URLSearchParams('page=2'), { defaultLimit: 10 }),
    ).toStrictEqual({ limit: 10, offset: 10, page: 2 });
  });

  test('honours a custom default page', () => {
    expect(
      parsePagination(new URLSearchParams('limit=10'), { defaultPage: 2 }),
    ).toStrictEqual({ limit: 10, offset: 10, page: 2 });
  });
});

describe('parseShortUUID', () => {
  test('returns an empty string for undefined', () => {
    expect(parseShortUUID(undefined)).toBe('');
  });

  test('returns an empty string for null', () => {
    expect(parseShortUUID(null)).toBe('');
  });

  test('returns an empty string for an empty string', () => {
    expect(parseShortUUID('')).toBe('');
  });

  test('returns the input unchanged when shorter than 8 characters', () => {
    expect(parseShortUUID('abc')).toBe('abc');
    expect(parseShortUUID('1234567')).toBe('1234567');
  });

  test('returns the full string when exactly 8 characters', () => {
    expect(parseShortUUID('12345678')).toBe('12345678');
  });

  test('returns the first 8 characters when longer than 8', () => {
    expect(parseShortUUID('502df2f0-64e9-481b-b378-75587e675ef3')).toBe(
      '502df2f0',
    );
  });
});
