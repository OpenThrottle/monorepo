import { describe, expect, test } from 'vitest';
import { parsePayloadField, splitList } from '../rule-form-payload';

describe('parsePayloadField', () => {
  test('returns a string field value', () => {
    expect(parsePayloadField('{"label":"hello"}', 'label')).toBe('hello');
  });

  test('joins an array field value with commas', () => {
    expect(parsePayloadField('{"tags":["a","b","c"]}', 'tags')).toBe('a, b, c');
  });

  test('returns empty string when the field is absent', () => {
    expect(parsePayloadField('{"other":"value"}', 'label')).toBe('');
  });

  test('returns empty string for a non-string, non-array field value', () => {
    expect(parsePayloadField('{"count":5}', 'count')).toBe('');
  });

  test('returns empty string when JSON is malformed', () => {
    expect(parsePayloadField('not json', 'label')).toBe('');
  });

  test('returns empty string when parsed JSON is not an object', () => {
    expect(parsePayloadField('42', 'label')).toBe('');
  });

  test('returns empty string when parsed JSON is null', () => {
    expect(parsePayloadField('null', 'label')).toBe('');
  });
});

describe('splitList', () => {
  test('splits a comma-separated string into trimmed entries', () => {
    expect(splitList('a, b ,c')).toEqual(['a', 'b', 'c']);
  });

  test('filters out empty entries', () => {
    expect(splitList('a,,b, ,c')).toEqual(['a', 'b', 'c']);
  });

  test('returns an empty array for an empty string', () => {
    expect(splitList('')).toEqual([]);
  });
});
