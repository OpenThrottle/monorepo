import { describe, expect, it } from 'vitest';

import {
  MAX_REDACTION_DEPTH,
  REDACTED_MARKER,
} from '../render-prompt.constants.ts';
import { redactCredentialKeys } from './sanitize.utils.ts';

describe('redactCredentialKeys', () => {
  describe('when the value is a primitive or null', () => {
    it('returns it unchanged', () => {
      expect(redactCredentialKeys('text')).toBe('text');
      expect(redactCredentialKeys(7)).toBe(7);
      expect(redactCredentialKeys(null)).toBeNull();
      expect(redactCredentialKeys(undefined)).toBeUndefined();
    });
  });

  describe('when the value is an object', () => {
    it('redacts credential-looking keys and keeps the rest', () => {
      expect(redactCredentialKeys({ apiKey: 'k', name: 'n' })).toEqual({
        apiKey: REDACTED_MARKER,
        name: 'n',
      });
    });

    it('recurses into nested objects', () => {
      expect(redactCredentialKeys({ outer: { token: 't' } })).toEqual({
        outer: { token: REDACTED_MARKER },
      });
    });
  });

  describe('when the value is an array', () => {
    it('keeps it an array and redacts inside each element', () => {
      const redacted = redactCredentialKeys([{ password: 'p' }, 'plain']);

      expect(Array.isArray(redacted)).toBe(true);
      expect(redacted).toEqual([{ password: REDACTED_MARKER }, 'plain']);
    });

    it('redacts inside an array nested under an object', () => {
      expect(redactCredentialKeys({ items: [{ secret: 's' }] })).toEqual({
        items: [{ secret: REDACTED_MARKER }],
      });
    });
  });

  describe('when the depth limit is reached', () => {
    it('drops an object branch', () => {
      expect(redactCredentialKeys({ a: 1 }, MAX_REDACTION_DEPTH)).toBe(
        REDACTED_MARKER,
      );
    });

    it('drops an array branch', () => {
      expect(redactCredentialKeys([1], MAX_REDACTION_DEPTH)).toBe(
        REDACTED_MARKER,
      );
    });
  });
});
