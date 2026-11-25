// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { messageOrFallback } from '../utils.error-message';

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
