import { describe, expect, it } from 'vitest';

import { toErrorMessage } from '../errors.ts';

describe('toErrorMessage', () => {
  describe('without a fallback', () => {
    it('returns the message of an Error', () => {
      expect(toErrorMessage(new Error('boom'))).toBe('boom');
    });

    it('stringifies a non-Error value', () => {
      expect(toErrorMessage('plain string')).toBe('plain string');
      expect(toErrorMessage(42)).toBe('42');
      expect(toErrorMessage(undefined)).toBe('undefined');
    });

    it('returns an empty message as-is', () => {
      expect(toErrorMessage(new Error(''))).toBe('');
    });
  });

  describe('with a fallback', () => {
    it('keeps a non-blank message', () => {
      expect(toErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
    });

    it('uses the fallback for an empty or whitespace-only message', () => {
      expect(toErrorMessage(new Error(''), 'fallback')).toBe('fallback');
      expect(toErrorMessage(new Error('   '), 'fallback')).toBe('fallback');
      expect(toErrorMessage('', 'fallback')).toBe('fallback');
    });
  });
});
