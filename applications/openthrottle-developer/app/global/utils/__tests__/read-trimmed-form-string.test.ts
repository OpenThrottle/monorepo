import { describe, expect, it } from 'vitest';

import { readTrimmedFormString } from '../read-trimmed-form-string';

describe('readTrimmedFormString', () => {
  describe('with a string entry', () => {
    it('trims surrounding whitespace', () => {
      expect(readTrimmedFormString('  abc  ')).toBe('abc');
    });
  });

  describe('with a missing or non-string entry', () => {
    it('returns the empty string for null', () => {
      expect(readTrimmedFormString(null)).toBe('');
    });

    it('returns the empty string for a file', () => {
      const file = new File(['x'], 'x.txt');

      expect(readTrimmedFormString(file)).toBe('');
    });
  });
});
