import { describe, expect, test } from 'vitest';

import {
  formatBlogDate,
  getBlogAuthorInitials,
  toBlogIsoDate,
} from '../blog-format';

describe('blog-format', () => {
  describe('formatBlogDate', () => {
    test('formats ISO strings in UTC', () => {
      expect(formatBlogDate('2026-03-04T23:59:59.000Z')).toBe('March 4, 2026');
    });

    test('returns null for nullish or invalid input', () => {
      expect(formatBlogDate(null)).toBeNull();
      expect(formatBlogDate(undefined)).toBeNull();
      expect(formatBlogDate('not a date')).toBeNull();
    });
  });

  test('toBlogIsoDate normalizes to an ISO string', () => {
    expect(toBlogIsoDate('2026-03-04T10:00:00Z')).toBe(
      '2026-03-04T10:00:00.000Z',
    );
    expect(toBlogIsoDate(null)).toBeNull();
  });

  test('getBlogAuthorInitials takes up to two initials', () => {
    expect(getBlogAuthorInitials('ada lovelace byron')).toBe('AL');
    expect(getBlogAuthorInitials('Ada')).toBe('A');
  });
});
