import { describe, expect, test } from 'vitest';

import { errorMessageOr } from '../error-message';

describe('errorMessageOr', () => {
  test('returns the message of an Error', () => {
    expect(errorMessageOr(new Error('boom'), 'fallback')).toBe('boom');
  });

  test('returns the fallback for anything else', () => {
    expect(errorMessageOr('boom', 'fallback')).toBe('fallback');
  });
});
