import { describe, expect, test } from 'vitest';

import { resolveSaveError } from '../resolve-save-error';

describe('resolveSaveError', () => {
  test('returns the message of an error outcome', () => {
    expect(resolveSaveError({ message: 'boom', outcome: 'error' })).toBe(
      'boom',
    );
  });

  test('returns the message of a notFound outcome', () => {
    expect(resolveSaveError({ message: 'gone', outcome: 'notFound' })).toBe(
      'gone',
    );
  });

  test('returns null for a saved outcome', () => {
    expect(resolveSaveError({ outcome: 'saved' })).toBeNull();
  });

  test('returns null when there is no result', () => {
    expect(resolveSaveError(null)).toBeNull();
  });
});
