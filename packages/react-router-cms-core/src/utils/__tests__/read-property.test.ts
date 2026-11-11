import { describe, expect, test } from 'vitest';

import {
  readOneOf,
  readOptionalString,
  readString,
  readStringList,
  readStringRecord,
} from '../read-property';

const properties = {
  count: 3,
  list: ['a', 1, 'b'],
  record: { a: 'x', b: 2 },
  size: 'lg',
  title: 'Hello',
};

describe('utils/read-property', () => {
  test('readString falls back when the value is not a string', () => {
    expect(readString(properties, 'title', '')).toBe('Hello');
    expect(readString(properties, 'count', 'none')).toBe('none');
  });

  test('readOptionalString is undefined when the value is not a string', () => {
    expect(readOptionalString(properties, 'title')).toBe('Hello');
    expect(readOptionalString(properties, 'missing')).toBeUndefined();
  });

  test('readOneOf only accepts a listed option', () => {
    expect(readOneOf(properties, 'size', ['sm', 'lg'], 'sm')).toBe('lg');
    expect(readOneOf(properties, 'title', ['sm', 'lg'], 'sm')).toBe('sm');
  });

  test('readStringList keeps only string items', () => {
    expect(readStringList(properties, 'list')).toStrictEqual(['a', 'b']);
    expect(readStringList(properties, 'title')).toStrictEqual([]);
  });

  test('readStringRecord keeps only string values', () => {
    expect(readStringRecord(properties, 'record')).toStrictEqual({ a: 'x' });
    expect(readStringRecord(properties, 'list')).toStrictEqual({});
  });
});
