import { describe, expect, it } from 'vitest';

import { parseJson } from '../json';

describe('parseJson', () => {
  describe('with valid JSON', () => {
    it('returns the parsed value', () => {
      expect(parseJson('{"a":1}')).toEqual({ a: 1 });
      expect(parseJson('[1,2]')).toEqual([1, 2]);
      expect(parseJson('null')).toBeNull();
    });
  });

  describe('with nothing to parse', () => {
    it.each([null, undefined, ''])('returns undefined for %j', (input) => {
      expect(parseJson(input)).toBeUndefined();
    });
  });

  describe('with malformed JSON', () => {
    it('returns undefined instead of throwing', () => {
      expect(parseJson('{nope')).toBeUndefined();
    });
  });
});
