// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { messageOrFallback, toErrorMessage } from '../utils.error-message';

describe('messageOrFallback', () => {
  test('returns the message when it has non-whitespace content', () => {
    expect(messageOrFallback('Boom.', 'fallback')).toBe('Boom.');
  });

  test('falls back for empty, whitespace-only, null, and undefined', () => {
    expect(messageOrFallback('', 'fallback')).toBe('fallback');
    expect(messageOrFallback('   ', 'fallback')).toBe('fallback');
    expect(messageOrFallback('\n\t', 'fallback')).toBe('fallback');
    expect(messageOrFallback(null, 'fallback')).toBe('fallback');
    expect(messageOrFallback(undefined, 'fallback')).toBe('fallback');
  });
});

describe('toErrorMessage', () => {
  test('returns a non-empty Error message', () => {
    expect(toErrorMessage(new Error('network down'), 'fallback')).toBe(
      'network down',
    );
  });

  test('falls back for an Error with an empty or whitespace message', () => {
    expect(toErrorMessage(new Error(''), 'fallback')).toBe('fallback');
    expect(toErrorMessage(new Error('   '), 'fallback')).toBe('fallback');
  });

  test('falls back for a non-Error value that stringifies to blank', () => {
    expect(toErrorMessage('', 'fallback')).toBe('fallback');
    expect(toErrorMessage('   ', 'fallback')).toBe('fallback');
  });

  test('stringifies a non-Error, non-blank value', () => {
    expect(toErrorMessage('plain string', 'fallback')).toBe('plain string');
  });
});
