import { describe, expect, test } from 'vitest';

import { toError } from '../to-error';

describe('toError', () => {
  test('returns an Error unchanged', () => {
    const error = new Error('boom');

    expect(toError(error)).toBe(error);
  });

  test('wraps a non-Error value in an Error', () => {
    const error = toError('boom');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('boom');
  });
});
