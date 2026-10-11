import { describe, expect, it } from 'vitest';

import {
  decodeBlogPostCursor,
  encodeBlogPostCursor,
} from './blog-post-cursor.ts';

describe('blog post cursor', () => {
  const cursor = {
    id: '11111111-1111-4111-8111-111111111111',
    publishedAt: '2026-10-01T12:00:00.123456Z',
  };

  describe('round trip', () => {
    it('decodes what it encoded, keeping microsecond precision', () => {
      expect(decodeBlogPostCursor(encodeBlogPostCursor(cursor))).toEqual(
        cursor,
      );
    });

    it('is opaque (does not expose the raw pair)', () => {
      const encoded = encodeBlogPostCursor(cursor);

      expect(encoded).not.toContain(cursor.id);
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('invalid input', () => {
    it.each([
      ['empty', ''],
      ['not base64 of a pair', 'abc'],
      ['bad timestamp', Buffer.from(`nope|${cursor.id}`).toString('base64url')],
      [
        'bad id',
        Buffer.from(`${cursor.publishedAt}|nope`).toString('base64url'),
      ],
      [
        'extra segment',
        Buffer.from(`${cursor.publishedAt}|${cursor.id}|x`).toString(
          'base64url',
        ),
      ],
    ])('returns null for %s', (_label, value) => {
      expect(decodeBlogPostCursor(value)).toBeNull();
    });
  });
});
