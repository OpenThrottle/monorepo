import { describe, expect, test } from 'vitest';

import { isInvalidBlogCursorError } from '../blog-cursor';

describe('isInvalidBlogCursorError', () => {
  test('matches the server BAD_REQUEST message in either transport shape', () => {
    expect(
      isInvalidBlogCursorError(
        new Error('GraphQL errors: Invalid pagination cursor.'),
      ),
    ).toBe(true);
    expect(
      isInvalidBlogCursorError(
        new Error(
          'openthrottle-server GraphQL error 400: Invalid pagination cursor.',
        ),
      ),
    ).toBe(true);
  });

  test('rejects unrelated errors and non-errors', () => {
    expect(isInvalidBlogCursorError(new Error('connect ECONNREFUSED'))).toBe(
      false,
    );
    expect(isInvalidBlogCursorError('Invalid pagination cursor')).toBe(false);
    expect(isInvalidBlogCursorError(null)).toBe(false);
  });
});
