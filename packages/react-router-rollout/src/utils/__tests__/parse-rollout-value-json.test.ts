import { describe, expect, it } from 'vitest';

import { parseRolloutValueJson } from '../parse-rollout-value-json';

describe('parseRolloutValueJson', () => {
  describe('when valueJson matches kind', () => {
    it('parses boolean, string, number, and json', () => {
      expect(parseRolloutValueJson('boolean', 'true')).toBe(true);
      expect(parseRolloutValueJson('string', '"system"')).toBe('system');
      expect(parseRolloutValueJson('number', '42')).toBe(42);
      expect(parseRolloutValueJson('json', '{"a":1}')).toEqual({ a: 1 });
    });
  });

  describe('when valueJson is invalid or mismatched', () => {
    it('returns undefined', () => {
      expect(parseRolloutValueJson('boolean', '"true"')).toBeUndefined();
      expect(parseRolloutValueJson('string', 'true')).toBeUndefined();
      expect(parseRolloutValueJson('number', '"1"')).toBeUndefined();
      expect(parseRolloutValueJson('json', 'null')).toBeUndefined();
      expect(parseRolloutValueJson('json', '{')).toBeUndefined();
    });
  });
});
