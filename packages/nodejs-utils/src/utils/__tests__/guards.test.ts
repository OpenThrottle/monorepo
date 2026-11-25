import { describe, expect, it } from 'vitest';

import { isErrorWithCode, isRecord, isStringArray } from '../guards.ts';

describe('isRecord', () => {
  it('accepts plain objects, including empty ones', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ id: 'x' })).toBe(true);
    expect(isRecord({ nested: { count: 1 } })).toBe(true);
  });

  it('rejects null', () => {
    expect(isRecord(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isRecord(undefined)).toBe(false);
  });

  it('rejects arrays, including empty ones', () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2, 3])).toBe(false);
  });

  it('rejects primitives', () => {
    expect(isRecord('a string')).toBe(false);
    expect(isRecord(7)).toBe(false);
    expect(isRecord(true)).toBe(false);
  });

  it('rejects functions', () => {
    expect(isRecord(() => undefined)).toBe(false);
    expect(isRecord(function named() {})).toBe(false);
  });

  it('narrows to Record<string, unknown> for safe property access', () => {
    const value: unknown = { date: '2024-01-01', total: 3 };

    if (isRecord(value)) {
      expect(value.date).toBe('2024-01-01');
      expect(value.total).toBe(3);
    } else {
      throw new Error('expected value to be narrowed as a record');
    }
  });
});

describe('isStringArray', () => {
  it('accepts arrays of strings, including empty ones', () => {
    expect(isStringArray([])).toBe(true);
    expect(isStringArray(['a', 'b'])).toBe(true);
  });

  it('rejects arrays holding a non-string', () => {
    expect(isStringArray(['a', 1])).toBe(false);
    expect(isStringArray([null])).toBe(false);
  });

  it('rejects non-arrays', () => {
    expect(isStringArray('a')).toBe(false);
    expect(isStringArray({ 0: 'a', length: 1 })).toBe(false);
    expect(isStringArray(undefined)).toBe(false);
  });
});

describe('isErrorWithCode', () => {
  it('accepts an Error with a string code', () => {
    const error = Object.assign(new Error('missing'), { code: 'ENOENT' });

    expect(isErrorWithCode(error)).toBe(true);
  });

  it('rejects an Error without a code', () => {
    expect(isErrorWithCode(new Error('plain'))).toBe(false);
  });

  it('rejects an Error whose code is not a string', () => {
    const error = Object.assign(new Error('numeric'), { code: 42 });

    expect(isErrorWithCode(error)).toBe(false);
  });

  it('rejects a non-Error object carrying a code', () => {
    expect(isErrorWithCode({ code: 'ENOENT', message: 'x' })).toBe(false);
  });
});
