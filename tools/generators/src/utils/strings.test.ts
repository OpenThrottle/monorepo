import { describe, expect, test } from 'vitest';

import { parseCommaSeparatedValues, toConstantCase } from './strings.ts';

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

describe('toConstantCase', () => {
  test('joins kebab-case words with underscores', () => {
    expect(toConstantCase('probe-area')).toBe('PROBE_AREA');
  });

  test('splits camelCase and PascalCase words', () => {
    expect(toConstantCase('TestBadge')).toBe('TEST_BADGE');
    expect(toConstantCase('usePlanOutput')).toBe('USE_PLAN_OUTPUT');
  });

  test('keeps digits attached to their word', () => {
    expect(toConstantCase('v2-api')).toBe('V2_API');
  });

  test('leaves a single word as plain upper case', () => {
    expect(toConstantCase('plans')).toBe('PLANS');
  });

  test('collapses repeated and edge separators', () => {
    expect(toConstantCase('--a__b  c-')).toBe('A_B_C');
  });
});
