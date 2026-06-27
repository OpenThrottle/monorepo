import { describe, expect, test } from 'vitest';
import { parseCommaSeparatedValues } from './strings';

describe('parseCommaSeparatedValues', () => {
  test('splits a simple comma-separated list', () => {
    expect(parseCommaSeparatedValues('a,b,c')).toStrictEqual(['a', 'b', 'c']);
  });

  test('trims whitespace around each token', () => {
    expect(parseCommaSeparatedValues('a, b ,  c')).toStrictEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('drops empty tokens from consecutive commas ("A,,B")', () => {
    expect(parseCommaSeparatedValues('A,,B')).toStrictEqual(['A', 'B']);
  });

  test('drops a trailing comma', () => {
    expect(parseCommaSeparatedValues('A,B,')).toStrictEqual(['A', 'B']);
  });

  test('drops a leading comma', () => {
    expect(parseCommaSeparatedValues(',A,B')).toStrictEqual(['A', 'B']);
  });

  test('drops whitespace-only tokens', () => {
    expect(parseCommaSeparatedValues('A, ,B')).toStrictEqual(['A', 'B']);
  });

  test('preserves duplicate names (no de-duplication)', () => {
    expect(parseCommaSeparatedValues('A,B,A')).toStrictEqual(['A', 'B', 'A']);
  });

  test('returns an empty array for an empty string', () => {
    expect(parseCommaSeparatedValues('')).toStrictEqual([]);
  });

  test('returns an empty array for commas-only input', () => {
    expect(parseCommaSeparatedValues(',,,')).toStrictEqual([]);
  });

  test('returns a single token when there are no commas', () => {
    expect(parseCommaSeparatedValues('solo')).toStrictEqual(['solo']);
  });
});
