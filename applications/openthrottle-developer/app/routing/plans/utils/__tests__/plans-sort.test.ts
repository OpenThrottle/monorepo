import { describe, expect, test } from 'vitest';
import { isPlansSortBy, isPlansSortOrder } from '../plans-sort';

describe('isPlansSortBy', () => {
  test.each(['createdAt', 'name', 'updatedAt'])(
    'returns true for known sort field "%s"',
    (value) => {
      expect(isPlansSortBy(value)).toBe(true);
    },
  );

  test('returns false for an unknown sort field', () => {
    expect(isPlansSortBy('status')).toBe(false);
  });

  test('returns false for an empty string', () => {
    expect(isPlansSortBy('')).toBe(false);
  });
});

describe('isPlansSortOrder', () => {
  test.each(['asc', 'desc'])(
    'returns true for known sort order "%s"',
    (value) => {
      expect(isPlansSortOrder(value)).toBe(true);
    },
  );

  test('returns false for an unknown sort order', () => {
    expect(isPlansSortOrder('ascending')).toBe(false);
  });

  test('returns false for an empty string', () => {
    expect(isPlansSortOrder('')).toBe(false);
  });
});
