import { describe, expect, test } from 'vitest';

import {
  getAnyOfOptionLabels,
  toEnumOptions,
  toInputValue,
  toListValue,
} from '../form-value';

describe('utils/toInputValue', () => {
  test('keeps strings and stringifies finite numbers', () => {
    expect(toInputValue('hello')).toBe('hello');
    expect(toInputValue(4.5)).toBe('4.5');
  });

  test('is empty for anything else', () => {
    expect(toInputValue(undefined)).toBe('');
    expect(toInputValue(Number.NaN)).toBe('');
    expect(toInputValue({ a: 1 })).toBe('');
  });
});

describe('utils/toListValue', () => {
  test('keeps arrays and empties anything else', () => {
    expect(toListValue(['a'])).toStrictEqual(['a']);
    expect(toListValue('a')).toStrictEqual([]);
  });
});

describe('utils/toEnumOptions', () => {
  test('stringifies scalar options and drops the rest', () => {
    expect(toEnumOptions(['sm', 2, null, { a: 1 }])).toStrictEqual(['sm', '2']);
    expect(toEnumOptions(undefined)).toStrictEqual([]);
  });
});

describe('utils/getAnyOfOptionLabels', () => {
  test('names refs by definition, then by type, then by position', () => {
    expect(
      getAnyOfOptionLabels([
        { $ref: '#/definitions/ButtonProps' },
        { type: 'string' },
        {},
      ]),
    ).toStrictEqual(['ButtonProps', 'string', 'Option 3']);
  });
});
